import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, GripVertical, Pencil, Plus, Printer, ScrollText, Trash2, Upload } from 'lucide-react';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import ExamBuilderProofPickerDialog from '@/components/examV2/ExamBuilderProofPickerDialog.jsx';
import GroupEditorDialog from '@/components/examV2/GroupEditorDialog.jsx';
import QuestionEditorDialog from '@/components/examV2/QuestionEditorDialog.jsx';
import QuestionTreeEditor from '@/components/examV2/QuestionTreeEditor.jsx';
import AdmissionOverridesEditor from '@/components/examV2/AdmissionOverridesEditor.jsx';
import ExamBuilderSafePreviewDialog from '@/components/examV2/ExamBuilderSafePreviewDialog.jsx';
import MoveSelectedQuestionsDialog from '@/components/examV2/MoveSelectedQuestionsDialog.jsx';
import ExportQuestionsDialog from '@/components/examV2/ExportQuestionsDialog.jsx';
import ExamV2ImportChooserDialog from '@/components/examV2/ExamV2ImportChooserDialog.jsx';
import ExamV2ExcelImportDialog from '@/components/examV2/ExamV2ExcelImportDialog.jsx';
import ExamV2TextImportDialog from '@/components/examV2/ExamV2TextImportDialog.jsx';
import PrintExamV2Dialog from '@/components/examV2/PrintExamV2Dialog.jsx';
import { buildItemTree, collectDescendantIds, getJointLabel, getProofDisplayName, getProofTypeLabel, parseIdsField, truncateGroupLabel } from '@/lib/examV2Utils';

function proofMatchesParty(proof, partyId) {
  if (!partyId) return true;
  const attachedPartyIds = parseIdsField(proof?.party_ids);
  return attachedPartyIds.includes(partyId) || proof?.party_id === partyId;
}

function ToolbarSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-300 focus:outline-none">
      {children}
    </select>
  );
}

const PARTY_SIDE_ORDER = ['Plaintiff', 'Defense', 'Neutral'];

function comparePartiesByFirstName(a, b) {
  const firstComparison = String(a?.first_name || '').localeCompare(String(b?.first_name || ''), undefined, { sensitivity: 'base' });
  if (firstComparison !== 0) return firstComparison;
  return String(a?.last_name || '').localeCompare(String(b?.last_name || ''), undefined, { sensitivity: 'base' });
}

function renderGroupedPartyOptions(parties = [], { placeholderLabel = null, allLabel = null } = {}) {
  const groups = PARTY_SIDE_ORDER
    .map((side) => ({
      side,
      items: [...parties].filter((party) => party.side === side).sort(comparePartiesByFirstName),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {placeholderLabel ? <option value="">{placeholderLabel}</option> : null}
      {allLabel ? <option value="all">{allLabel}</option> : null}
      {groups.flatMap((group, index) => [
        ...(index > 0 ? [<option key={`${group.side}-separator`} disabled>──────────</option>] : []),
        <option key={`${group.side}-label`} disabled>{group.side}</option>,
        ...group.items.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>),
      ])}
    </>
  );
}

function getStoredExamV2Setting(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  return value ?? fallback;
}

function flattenTree(nodes = []) {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children || [])]);
}

function serializeQuestionTree(nodes = [], questionItems = [], proofsById = {}, level = 0) {
  return nodes.flatMap((node) => {
    const indent = '  '.repeat(level);
    const lines = [`${indent}- ${node.text || ''}`];

    if (node.expected_answer) lines.push(`${indent}  -> ${node.expected_answer}`);
    if (node.notes) lines.push(`${indent}  @notes: ${node.notes}`);

    const attachedProofNames = parseIdsField(node.attached_proof_ids)
      .map((proofId) => getProofDisplayName(proofsById[proofId]))
      .filter(Boolean);

    if (attachedProofNames.length > 0) lines.push(`${indent}  @attach: ${attachedProofNames.join(' | ')}`);

    const children = questionItems
      .filter((item) => item.parent_item_id === node.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return [...lines, ...serializeQuestionTree(children, questionItems, proofsById, level + 1)];
  });
}

function chunkItems(items = [], chunkSize = 25) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

async function bulkCreateExamItems(items = []) {
  const createdItems = [];

  for (const chunk of chunkItems(items)) {
    const createdChunk = await base44.entities.ExamItemV2.bulkCreate(chunk);
    createdItems.push(...createdChunk);
  }

  return createdItems;
}

async function createImportedQuestionTree({ examId, rootItemId, rootItemType, questionRows, examOrder }) {
  const normalizeQuestionKey = (value) => String(value || '').trim().toLowerCase();
  const createdQuestionIdsByKey = {};
  const childOrderByParentId = {};
  const baseQuestionSortOrder = rootItemType === 'proof' ? 1 : 0;

  const topLevelRows = questionRows.filter((row) => !row.parent_question_text);
  const createdTopLevelQuestions = await bulkCreateExamItems(topLevelRows.map((row, index) => ({
    exam_id: examId,
    item_type: 'question',
    parent_item_id: rootItemId,
    sort_order: baseQuestionSortOrder + index,
    text: row.question_text,
    expected_answer: row.expected_answer || '',
    notes: row.notes || '',
    attached_proof_ids: row.attached_proof_ids?.length ? { ids: row.attached_proof_ids } : null,
  })));

  createdTopLevelQuestions.forEach((createdQuestion, index) => {
    const key = normalizeQuestionKey(topLevelRows[index]?.question_text);
    if (key) createdQuestionIdsByKey[key] = createdQuestion.id;
  });

  let pendingRows = questionRows.filter((row) => row.parent_question_text);

  while (pendingRows.length > 0) {
    const readyRows = pendingRows.filter((row) => createdQuestionIdsByKey[normalizeQuestionKey(row.parent_question_text)]);

    if (readyRows.length === 0) {
      throw new Error(`Parent question could not be found inside exam order ${examOrder}.`);
    }

    const createdChildQuestions = await bulkCreateExamItems(readyRows.map((row) => {
      const parentQuestionId = createdQuestionIdsByKey[normalizeQuestionKey(row.parent_question_text)];
      const childSortOrder = childOrderByParentId[parentQuestionId] || 0;
      childOrderByParentId[parentQuestionId] = childSortOrder + 1;

      return {
        exam_id: examId,
        item_type: 'question',
        parent_item_id: parentQuestionId,
        sort_order: childSortOrder,
        text: row.question_text,
        expected_answer: row.expected_answer || '',
        notes: row.notes || '',
        attached_proof_ids: row.attached_proof_ids?.length ? { ids: row.attached_proof_ids } : null,
      };
    }));

    createdChildQuestions.forEach((createdQuestion, index) => {
      const key = normalizeQuestionKey(readyRows[index]?.question_text);
      if (key) createdQuestionIdsByKey[key] = createdQuestion.id;
    });

    pendingRows = pendingRows.filter((row) => !readyRows.includes(row));
  }
}

export default function ExamBuilderV2() {
  const queryClient = useQueryClient();
  const [selectedPartyId, setSelectedPartyId] = useState(() => getStoredExamV2Setting('exam-v2-selected-party', ''));
  const [selectedExamType, setSelectedExamType] = useState(() => getStoredExamV2Setting('exam-v2-selected-type', 'Direct'));
  const [selectedRootId, setSelectedRootId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupDialog, setGroupDialog] = useState({ open: false, initialItem: null });
  const [questionDialog, setQuestionDialog] = useState({ open: false, parentId: null, initialValue: null, title: 'Question' });
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [previewDialogProof, setPreviewDialogProof] = useState(null);
  const [importChooserOpen, setImportChooserOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [textImportDialogOpen, setTextImportDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [leftColumnCollapsed, setLeftColumnCollapsed] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [partyExportDialogOpen, setPartyExportDialogOpen] = useState(false);

  const { data: parties = [] } = useQuery({ queryKey: ['v2Parties'], queryFn: () => base44.entities.Party.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['v2Proofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: exams = [] } = useQuery({ queryKey: ['v2Exams'], queryFn: () => base44.entities.ExamV2.list() });
  const { data: examItems = [] } = useQuery({ queryKey: ['v2ExamItems'], queryFn: () => base44.entities.ExamItemV2.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['v2AdmissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });

  const selectedParty = parties.find((party) => party.id === selectedPartyId) || null;
  const currentExam = exams.find((exam) => exam.party_id === selectedPartyId && exam.exam_type === selectedExamType) || null;
  const currentItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootItems = useMemo(() => currentItems.filter((item) => !item.parent_item_id && item.item_type !== 'question').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [currentItems]);
  const selectedRoot = rootItems.find((item) => item.id === selectedRootId) || rootItems[0] || null;
  const selectedRootProof = selectedRoot?.item_type === 'proof' ? proofs.find((proof) => proof.id === selectedRoot.linked_proof_id) || null : null;
  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const itemsById = useMemo(() => Object.fromEntries(currentItems.map((item) => [item.id, item])), [currentItems]);
  const availableAttachmentProofs = useMemo(
    () => proofs.filter((proof) => proof.proof_category === 'Deposition' || ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)),
    [proofs]
  );
  const admissionStatusMeta = selectedRootProof?.status === 'Admitted'
    ? { label: `Admitted as Exhibit · #${selectedRootProof.admitted_exhibit_num || '—'}`, color: 'text-red-400' }
    : selectedRootProof?.status === 'Demonstrative'
      ? { label: `Admitted as Demonstrative · #${selectedRootProof.demonstrative_exhibit_num || selectedRootProof.joint_exhibit_num || '—'}`, color: 'text-blue-400' }
      : null;
  const selectableProofs = useMemo(
    () => proofs.filter((proof) => proof.proof_category === 'Deposition' || ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)),
    [proofs]
  );
  const questionItems = useMemo(() => currentItems.filter((item) => item.item_type === 'question'), [currentItems]);
  const visibleQuestionTree = useMemo(
    () => (selectedRoot ? buildItemTree(questionItems, selectedRoot.id) : []),
    [questionItems, selectedRoot]
  );
  const visibleQuestionOrder = useMemo(
    () => flattenTree(visibleQuestionTree).map((item) => item.id),
    [visibleQuestionTree]
  );
  const selectedTopQuestions = useMemo(() => {
    const selectedSet = new Set(selectedQuestionIds);

    return visibleQuestionOrder
      .map((id) => itemsById[id])
      .filter(Boolean)
      .filter((item) => {
        if (!selectedSet.has(item.id)) return false;

        let parentId = item.parent_item_id;
        while (parentId && parentId !== selectedRoot?.id) {
          if (selectedSet.has(parentId)) return false;
          parentId = itemsById[parentId]?.parent_item_id || null;
        }

        return true;
      });
  }, [itemsById, selectedQuestionIds, selectedRoot?.id, visibleQuestionOrder]);
  const moveDestinations = useMemo(
    () => rootItems
      .filter((item) => item.id !== selectedRoot?.id)
      .map((item, index) => ({
        id: item.id,
        label: `${index + 1}. ${item.item_type === 'proof' ? getProofDisplayName(proofsById[item.linked_proof_id]) : item.label}`,
      })),
    [proofsById, rootItems, selectedRoot?.id]
  );
  const exportRootNodes = useMemo(
    () => (selectedTopQuestions.length > 0 ? selectedTopQuestions : visibleQuestionTree),
    [selectedTopQuestions, visibleQuestionTree]
  );
  const exportText = useMemo(() => {
    if (!selectedRoot) return '';

    const heading = selectedRoot.item_type === 'proof'
      ? `PROOF: ${getProofDisplayName(selectedRootProof || proofsById[selectedRoot.linked_proof_id])}`
      : `GROUP: ${selectedRoot.label || 'Untitled Group'}`;

    const lines = serializeQuestionTree(exportRootNodes, questionItems, proofsById);
    return [heading, '', ...lines].join('\n');
  }, [exportRootNodes, proofsById, questionItems, selectedRoot, selectedRootProof]);
  const partyExportText = useMemo(() => {
    if (!selectedParty || !currentExam || rootItems.length === 0) return '';

    const partyName = `${selectedParty.first_name || ''} ${selectedParty.last_name || ''}`.trim() || 'Selected Party';
    const sections = rootItems.flatMap((item) => {
      const heading = item.item_type === 'proof'
        ? `PROOF: ${getProofDisplayName(proofsById[item.linked_proof_id])}`
        : `GROUP: ${item.label || 'Untitled Group'}`;
      const tree = buildItemTree(questionItems, item.id);
      const lines = serializeQuestionTree(tree, questionItems, proofsById);
      return [heading, '', ...lines, '', '---', ''];
    });

    return [
      `PARTY: ${partyName}`,
      `EXAM TYPE: ${selectedExamType}`,
      '',
      ...sections.slice(0, -2),
    ].join('\n');
  }, [currentExam, proofsById, questionItems, rootItems, selectedExamType, selectedParty]);

  useEffect(() => {
    if (parties.length > 0 && !parties.some((party) => party.id === selectedPartyId)) {
      setSelectedPartyId(parties[0].id);
    }
  }, [parties, selectedPartyId]);

  useEffect(() => {
    if (!rootItems.length) {
      setSelectedRootId('');
      return;
    }
    if (!rootItems.some((item) => item.id === selectedRootId)) {
      setSelectedRootId(rootItems[0].id);
    }
  }, [rootItems, selectedRootId]);

  useEffect(() => {
    window.localStorage.setItem('exam-v2-selected-party', selectedPartyId || '');
    window.localStorage.setItem('exam-v2-selected-type', selectedExamType);
  }, [selectedPartyId, selectedExamType]);

  useEffect(() => {
    setSelectedQuestionIds((prev) => prev.filter((id) => visibleQuestionOrder.includes(id)));
  }, [visibleQuestionOrder]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['v2ExamItems'] });
  const invalidateExams = () => queryClient.invalidateQueries({ queryKey: ['v2Exams'] });

  const ensureExam = async () => {
    if (currentExam) return currentExam;
    const title = `${selectedParty?.first_name || 'Party'} ${selectedParty?.last_name || ''} ${selectedExamType}`.trim();
    const created = await base44.entities.ExamV2.create({ title, party_id: selectedPartyId, exam_type: selectedExamType, is_active: true });
    invalidateExams();
    return created;
  };

  const createRootItem = async (payload) => {
    const exam = await ensureExam();
    const nextOrder = rootItems.length;
    await base44.entities.ExamItemV2.create({ exam_id: exam.id, sort_order: nextOrder, ...payload });
    invalidate();
  };

  const createProofRootItem = async ({ examId, proof, sortOrder }) => {
    const rootProofItem = await base44.entities.ExamItemV2.create({
      exam_id: examId,
      item_type: 'proof',
      linked_proof_id: proof.id,
      label: getProofDisplayName(proof),
      step_overrides: {},
      sort_order: sortOrder,
    });

    await base44.entities.ExamItemV2.create({
      exam_id: examId,
      item_type: 'admission_script',
      parent_item_id: rootProofItem.id,
      label: 'Exhibit Admission Script',
      step_overrides: {},
      sort_order: 0,
    });

    return rootProofItem;
  };

  const addProofToExam = async (proof) => {
    const exam = await ensureExam();
    await createProofRootItem({ examId: exam.id, proof, sortOrder: rootItems.length });
    invalidate();
  };

  const addGroupToExam = async ({ label }) => {
    if (!label) return;

    if (groupDialog.initialItem) {
      await base44.entities.ExamItemV2.update(groupDialog.initialItem.id, {
        label: truncateGroupLabel(label),
      });
      invalidate();
      return;
    }

    await createRootItem({
      item_type: 'group',
      label: truncateGroupLabel(label),
    });
  };

  const admissionScriptItem = useMemo(
    () => currentItems.find((item) => item.parent_item_id === selectedRoot?.id && item.item_type === 'admission_script') || null,
    [currentItems, selectedRoot?.id]
  );

  useEffect(() => {
    let cancelled = false;

    async function ensureAdmissionScript() {
      if (!currentExam || !selectedRootProof || !selectedRoot || admissionScriptItem) return;

      const siblings = currentItems
        .filter((item) => item.parent_item_id === selectedRoot.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      await Promise.all(
        siblings.map((item, index) => base44.entities.ExamItemV2.update(item.id, { sort_order: index + 1 }))
      );

      await base44.entities.ExamItemV2.create({
        exam_id: currentExam.id,
        item_type: 'admission_script',
        parent_item_id: selectedRoot.id,
        label: 'Exhibit Admission Script',
        step_overrides: {},
        sort_order: 0,
      });

      if (!cancelled) invalidate();
    }

    ensureAdmissionScript();
    return () => {
      cancelled = true;
    };
  }, [currentExam?.id, selectedRoot?.id, selectedRootProof?.id, admissionScriptItem?.id, currentItems]);

  const saveQuestion = async (form) => {
    if (!questionDialog.parentId || !currentExam) return;

    const normalizedForm = {
      ...form,
      attached_proof_ids: Array.isArray(form.attached_proof_ids) && form.attached_proof_ids.length > 0
        ? { ids: form.attached_proof_ids }
        : null,
    };

    if (questionDialog.initialValue) {
      await base44.entities.ExamItemV2.update(questionDialog.initialValue.id, normalizedForm);
      invalidate();
      return;
    }

    const siblings = currentItems.filter(
      (item) => (item.item_type === 'question' || item.item_type === 'admission_script') && item.parent_item_id === questionDialog.parentId
    );
    const nextSortOrder = siblings.length > 0 ? Math.max(...siblings.map((item) => item.sort_order || 0)) + 1 : 0;

    await base44.entities.ExamItemV2.create({
      exam_id: currentExam.id,
      item_type: 'question',
      parent_item_id: questionDialog.parentId,
      sort_order: nextSortOrder,
      ...normalizedForm,
    });
    invalidate();
  };

  const getItemDepth = (itemId) => {
    let depth = 0;
    let currentParentId = itemsById[itemId]?.parent_item_id || null;

    while (currentParentId) {
      depth += 1;
      currentParentId = itemsById[currentParentId]?.parent_item_id || null;
    }

    return depth;
  };

  const deleteItemsSequentially = async (itemsToDelete = []) => {
    const orderedItems = [...itemsToDelete].sort((a, b) => getItemDepth(b.id) - getItemDepth(a.id));

    for (const entry of orderedItems) {
      await base44.entities.ExamItemV2.delete(entry.id);
    }
  };

  const deleteItem = async (item) => {
    const descendantIds = collectDescendantIds(currentItems, item.id);
    const itemsToDelete = [
      ...descendantIds.map((id) => itemsById[id]).filter(Boolean),
      item,
    ];

    await deleteItemsSequentially(itemsToDelete);
    invalidate();
  };

  const moveSelectedQuestions = async (destinationRootId) => {
    if (!destinationRootId || selectedTopQuestions.length === 0) return;

    const isChildItem = (item) => item.item_type === 'question' || item.item_type === 'admission_script';
    const selectedTopIds = new Set(selectedTopQuestions.map((item) => item.id));
    const sourceParentIds = [...new Set(selectedTopQuestions.map((item) => item.parent_item_id).filter(Boolean))];
    const destinationSiblings = currentItems
      .filter((item) => isChildItem(item) && item.parent_item_id === destinationRootId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const updates = [
      ...sourceParentIds.flatMap((parentId) => currentItems
        .filter((item) => isChildItem(item) && item.parent_item_id === parentId && !selectedTopIds.has(item.id))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((item, index) => ({ id: item.id, patch: { parent_item_id: parentId, sort_order: index } }))),
      ...destinationSiblings.map((item, index) => ({ id: item.id, patch: { parent_item_id: destinationRootId, sort_order: index } })),
      ...selectedTopQuestions.map((item, index) => ({ id: item.id, patch: { parent_item_id: destinationRootId, sort_order: destinationSiblings.length + index } })),
    ];

    await Promise.all(updates.map((updateItem) => base44.entities.ExamItemV2.update(updateItem.id, updateItem.patch)));
    setSelectedQuestionIds([]);
    setSelectedRootId(destinationRootId);
    invalidate();
  };

  const deleteAllQuestionsForParty = async () => {
    if (!currentExam || currentItems.length === 0 || !selectedParty) return;

    const partyName = `${selectedParty.first_name || ''} ${selectedParty.last_name || ''}`.trim() || 'this party';
    const confirmed = window.confirm(`Delete all exam content for ${partyName} (${selectedExamType})? This will remove all questions and groups for this party/exam only.`);
    if (!confirmed) return;

    await deleteItemsSequentially(currentItems);

    setSelectedQuestionIds([]);
    setSelectedRootId('');
    invalidate();
    invalidateExams();
  };

  const handleImportExamData = async (importedRootItems) => {
    if (!selectedPartyId) {
      throw new Error('Select a party before importing.');
    }

    const exam = await ensureExam();
    const createdRootIds = [];
    const baseSortOrder = rootItems.length;

    for (const [rootIndex, importedRoot] of importedRootItems.entries()) {
      let createdRootItem;

      if (importedRoot.item_type === 'proof') {
        if (!importedRoot.matched_root_proof) {
          throw new Error(`Proof "${importedRoot.root_item_name}" could not be found.`);
        }

        createdRootItem = await createProofRootItem({
          examId: exam.id,
          proof: importedRoot.matched_root_proof,
          sortOrder: baseSortOrder + rootIndex,
        });
      } else {
        createdRootItem = await base44.entities.ExamItemV2.create({
          exam_id: exam.id,
          item_type: 'group',
          label: truncateGroupLabel(importedRoot.root_item_name),
          sort_order: baseSortOrder + rootIndex,
        });
      }

      createdRootIds.push(createdRootItem.id);

      const questionRows = importedRoot.question_rows.filter((row) => row.question_text);
      if (questionRows.length === 0) continue;

      await createImportedQuestionTree({
        examId: exam.id,
        rootItemId: createdRootItem.id,
        rootItemType: importedRoot.item_type,
        questionRows,
        examOrder: importedRoot.exam_order,
      });
    }

    invalidate();
    if (createdRootIds[0]) setSelectedRootId(createdRootIds[0]);
  };

  const reorderRootItems = async (sourceIndex, destinationIndex) => {
    const reordered = [...rootItems];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);
    await Promise.all(reordered.map((item, index) => base44.entities.ExamItemV2.update(item.id, { sort_order: index })));
    invalidate();
  };

  const reorderQuestionItems = async (source, destination, draggableId) => {
    const decodeParent = (droppableId) => {
      const key = droppableId.replace('questions:', '');
      return key === 'root' ? selectedRoot.id : key;
    };

    const sourceParentId = decodeParent(source.droppableId);
    const destParentId = decodeParent(destination.droppableId);
    const isChildItem = (item) => item.item_type === 'question' || item.item_type === 'admission_script';
    const moved = currentItems.find((item) => item.id === draggableId);

    if (!moved) return;
    if (moved.item_type === 'admission_script' && destParentId !== selectedRoot.id) return;

    const sourceSiblings = currentItems.filter((item) => isChildItem(item) && item.parent_item_id === sourceParentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const destSiblings = sourceParentId === destParentId
      ? sourceSiblings
      : currentItems.filter((item) => isChildItem(item) && item.parent_item_id === destParentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const nextSource = [...sourceSiblings];
    nextSource.splice(source.index, 1);

    const nextDest = sourceParentId === destParentId ? nextSource : [...destSiblings];
    nextDest.splice(destination.index, 0, moved);

    if (destParentId === selectedRoot?.id && selectedRootProof) {
      const firstRestrictedIndex = nextDest.findIndex((item) => {
        if (item.item_type !== 'question') return false;
        const attachedIds = parseIdsField(item.attached_proof_ids);
        return attachedIds.some((proofId) => {
          const attachedProof = proofsById[proofId];
          return attachedProof?.parent_proof_id === selectedRootProof.id && ['ExtractClip', 'VideoClip'].includes(attachedProof?.proof_child_type);
        });
      });

      const scriptIndex = nextDest.findIndex((item) => item.item_type === 'admission_script');
      if (scriptIndex >= 0 && firstRestrictedIndex >= 0 && scriptIndex > firstRestrictedIndex) {
        const [scriptItem] = nextDest.splice(scriptIndex, 1);
        nextDest.splice(firstRestrictedIndex, 0, scriptItem);
      }
    }

    const updates = sourceParentId === destParentId
      ? nextDest.map((item, index) => ({ id: item.id, patch: { sort_order: index, parent_item_id: destParentId } }))
      : [
          ...nextSource.map((item, index) => ({ id: item.id, patch: { sort_order: index, parent_item_id: sourceParentId } })),
          ...nextDest.map((item, index) => ({ id: item.id, patch: { sort_order: index, parent_item_id: destParentId } })),
        ];

    await Promise.all(updates.map((updateItem) => base44.entities.ExamItemV2.update(updateItem.id, updateItem.patch)));
    invalidate();
  };

  const onDragEnd = async ({ source, destination, draggableId, type }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (type === 'ROOT') {
      await reorderRootItems(source.index, destination.index);
      return;
    }
    await reorderQuestionItems(source, destination, draggableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
          <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap items-center gap-2">
            <ToolbarSelect value={selectedPartyId} onChange={setSelectedPartyId}>
              {renderGroupedPartyOptions(parties, { placeholderLabel: 'Select party' })}
            </ToolbarSelect>
            <ToolbarSelect value={selectedExamType} onChange={setSelectedExamType}>
              <option value="Direct">Direct</option>
              <option value="Cross">Cross</option>
              <option value="Redirect">Redirect</option>
            </ToolbarSelect>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setPickerOpen(true)}>Add Joint Proof</Button>
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => setGroupDialog({ open: true, initialItem: null })}>Add Question Group</Button>
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-2" onClick={() => setImportChooserOpen(true)} disabled={!selectedPartyId}>
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => setPartyExportDialogOpen(true)} disabled={rootItems.length === 0}>
              Export Party Questions
            </Button>
            <Button variant="outline" className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800" onClick={deleteAllQuestionsForParty} disabled={currentItems.length === 0 || !selectedPartyId}>
              Delete All Exam Content
            </Button>
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-2" onClick={() => setPrintDialogOpen(true)} disabled={rootItems.length === 0}>
              <Printer className="w-4 h-4" /> Print Exam
            </Button>
            {!currentExam && selectedPartyId && <span className="text-xs text-slate-500">Choose an item action to create this V2 exam.</span>}
          </div>

          <div className={`grid grid-cols-1 h-[calc(100vh-10rem)] ${leftColumnCollapsed ? 'xl:grid-cols-[4.5rem_1fr]' : 'xl:grid-cols-[22rem_1fr]'}`}>
            <div className="flex min-h-0 flex-col border-r border-slate-800 p-4">
              <div className={`mb-3 flex items-center ${leftColumnCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
                {!leftColumnCollapsed && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Exam Order</p>}
                <button
                  type="button"
                  onClick={() => setLeftColumnCollapsed((value) => !value)}
                  className="h-9 w-9 rounded-md border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-400 hover:text-slate-200"
                  title={leftColumnCollapsed ? 'Expand exam order' : 'Collapse exam order'}
                >
                  {leftColumnCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
              {!leftColumnCollapsed && (
                <Droppable droppableId="root-items" type="ROOT">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="h-full space-y-3 overflow-y-auto pr-1">
                      {rootItems.map((item, index) => {
                        const proof = item.item_type === 'proof' ? proofsById[item.linked_proof_id] : null;
                        const active = selectedRootId === item.id;
                        return (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(dragProvided) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                onClick={() => setSelectedRootId(item.id)}
                                className={`w-full rounded-2xl border p-3 text-left cursor-pointer ${active ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/70'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <button type="button" {...dragProvided.dragHandleProps} className="mt-1 text-slate-500 hover:text-white flex-shrink-0">
                                    <GripVertical className="w-4 h-4" />
                                  </button>
                                  <div className="flex-shrink-0 relative">
                                    {proof ? <ExamBuilderProofThumb proof={proof} size="md" /> : <ExamBuilderProofThumb groupLabel={item.label} size="md" />}
                                    {proof && (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setPreviewDialogProof(proof);
                                        }}
                                        className="absolute -right-1 -top-1 h-7 w-7 rounded-full border border-slate-700 bg-slate-950/90 flex items-center justify-center text-slate-300 hover:text-white"
                                        title="Preview proof"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 pt-1">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600/20 px-1.5 text-[11px] font-semibold text-blue-300">{index + 1}</span>
                                      <p className="text-sm font-semibold text-white leading-snug truncate">{proof ? getProofDisplayName(proof) : item.label}</p>
                                    </div>
                                    {proof && (
                                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{proof.status}</span>
                                        {proof.joint_exhibit_num && <span>Joint # {proof.joint_exhibit_num}</span>}
                                        {proof.admitted_exhibit_num && <span>Admitted # {proof.admitted_exhibit_num}</span>}
                                        {proof.demonstrative_exhibit_num && <span>Demo # {proof.demonstrative_exhibit_num}</span>}
                                      </div>
                                    )}
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 flex-shrink-0" onClick={(event) => { event.stopPropagation(); deleteItem(item); }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>

            <div className="min-h-0 p-4 overflow-y-auto">
              {selectedRoot ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 overflow-y-auto min-h-[calc(100vh-14rem)]">
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question Builder</p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-lg font-semibold text-white">{selectedRootProof ? getProofDisplayName(selectedRootProof) : selectedRoot.label}</p>
                        {selectedRoot?.item_type === 'group' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={() => setGroupDialog({ open: true, initialItem: selectedRoot })}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedQuestionIds.length > 0 && <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">{selectedQuestionIds.length} selected</span>}
                      <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => setExportDialogOpen(true)} disabled={exportRootNodes.length === 0}>
                        Export {selectedQuestionIds.length > 0 ? 'Selected' : 'Questions'}
                      </Button>
                      {selectedQuestionIds.length > 0 && (
                        <>
                          <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => setMoveDialogOpen(true)} disabled={moveDestinations.length === 0}>
                            Move Selected
                          </Button>
                          <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => setSelectedQuestionIds([])}>
                            Clear Selection
                          </Button>
                        </>
                      )}
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setQuestionDialog({ open: true, parentId: selectedRoot.id, initialValue: null, title: 'Add Question' })}>
                        <Plus className="w-4 h-4 mr-2" /> Add Question
                      </Button>
                    </div>
                  </div>

                  <QuestionTreeEditor
                    parentId={selectedRoot.id}
                    rootParentId={selectedRoot.id}
                    items={currentItems.filter((item) => item.item_type === 'question' || item.item_type === 'admission_script')}
                    proofsById={proofsById}
                    admissionStatusMeta={admissionStatusMeta}
                    selectedQuestionIds={selectedQuestionIds}
                    onToggleSelect={(questionId) => setSelectedQuestionIds((prev) => prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId])}
                    onEdit={(item) => setQuestionDialog({ open: true, parentId: item.parent_item_id, initialValue: { ...item, attached_proof_ids: parseIdsField(item.attached_proof_ids) }, title: 'Edit Question' })}
                    onEditScript={() => setOverridesOpen(true)}
                    onAddFollowup={(item) => setQuestionDialog({ open: true, parentId: item.id, initialValue: null, title: 'Add Follow-up' })}
                    onDelete={deleteItem}
                    onSelectAttachment={(proof) => setPreviewDialogProof(proof)}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-slate-500">Add a proof or question group to begin your V2 exam.</div>
              )}
            </div>
          </div>
        </div>

        <ExamBuilderProofPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} proofs={selectableProofs} parties={parties} onSelect={addProofToExam} />
        <GroupEditorDialog
          open={groupDialog.open}
          onOpenChange={(open) => setGroupDialog((prev) => ({ ...prev, open }))}
          onSave={addGroupToExam}
          initialLabel={groupDialog.initialItem?.label || ''}
        />
        <QuestionEditorDialog
          open={questionDialog.open}
          onOpenChange={(open) => setQuestionDialog((prev) => ({ ...prev, open }))}
          onSave={saveQuestion}
          initialValue={questionDialog.initialValue}
          availableProofs={availableAttachmentProofs}
          parties={parties}
          title={questionDialog.title}
        />
        <MoveSelectedQuestionsDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          count={selectedQuestionIds.length}
          destinations={moveDestinations}
          onMove={moveSelectedQuestions}
        />
        <ExportQuestionsDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          title={selectedQuestionIds.length > 0 ? 'Export Selected Questions' : 'Export Questions'}
          description={selectedQuestionIds.length > 0 ? 'This export includes the selected question branches only.' : 'This export includes the full question section in V2 import format.'}
          content={exportText}
          fileName={`${String(selectedRootProof ? getProofDisplayName(selectedRootProof) : selectedRoot?.label || 'exam-builder-v2').trim().replace(/\s+/g, '-').toLowerCase()}.txt`}
        />
        <ExportQuestionsDialog
          open={partyExportDialogOpen}
          onOpenChange={setPartyExportDialogOpen}
          title="Export Party Questions"
          description="This export includes every proof and question group for the selected party and exam type."
          content={partyExportText}
          fileName={`${String(`${selectedParty?.first_name || ''} ${selectedParty?.last_name || ''} ${selectedExamType}` || 'party-exam-builder-v2').trim().replace(/\s+/g, '-').toLowerCase()}.txt`}
        />
        <ExamBuilderSafePreviewDialog
          open={!!previewDialogProof}
          onOpenChange={(open) => !open && setPreviewDialogProof(null)}
          proof={previewDialogProof}
          allProofs={proofs}
        />
        <AdmissionOverridesEditor
          open={overridesOpen}
          onOpenChange={setOverridesOpen}
          sourceBlock={selectedRootProof ? { proof_type_category_id: selectedRootProof.proof_type_category_id, step_overrides: admissionScriptItem?.step_overrides || selectedRoot?.step_overrides || {} } : null}
          templates={admissionTemplates}
          exhibitNum={selectedRootProof?.joint_exhibit_num || ''}
          onSave={(step_overrides) => admissionScriptItem ? base44.entities.ExamItemV2.update(admissionScriptItem.id, { step_overrides }).then(invalidate) : Promise.resolve()}
        />
        <ExamV2ImportChooserDialog
          open={importChooserOpen}
          onOpenChange={setImportChooserOpen}
          onChooseExcel={() => {
            setImportChooserOpen(false);
            setImportDialogOpen(true);
          }}
          onChooseText={() => {
            setImportChooserOpen(false);
            setTextImportDialogOpen(true);
          }}
        />
        <ExamV2TextImportDialog
          open={textImportDialogOpen}
          onOpenChange={setTextImportDialogOpen}
          parties={parties}
          selectedPartyId={selectedPartyId}
          onSelectedPartyIdChange={setSelectedPartyId}
          selectedExamType={selectedExamType}
          onSelectedExamTypeChange={setSelectedExamType}
          availableRootProofs={selectableProofs}
          allProofs={proofs}
          onImport={handleImportExamData}
        />
        <ExamV2ExcelImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          parties={parties}
          selectedPartyId={selectedPartyId}
          onSelectedPartyIdChange={setSelectedPartyId}
          selectedExamType={selectedExamType}
          onSelectedExamTypeChange={setSelectedExamType}
          availableRootProofs={selectableProofs}
          allProofs={proofs}
          onImport={handleImportExamData}
        />
        <PrintExamV2Dialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          party={selectedParty}
          examType={selectedExamType}
          rootItems={rootItems}
          currentItems={currentItems}
          proofsById={proofsById}
          admissionTemplates={admissionTemplates}
        />
      </div>
    </DragDropContext>
  );
}