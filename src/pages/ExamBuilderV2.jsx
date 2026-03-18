import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, GripVertical, Pencil, Plus, Printer, ScrollText, Trash2, Upload } from 'lucide-react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import ProofPickerDialog from '@/components/examV2/ProofPickerDialog.jsx';
import GroupEditorDialog from '@/components/examV2/GroupEditorDialog.jsx';
import QuestionEditorDialog from '@/components/examV2/QuestionEditorDialog.jsx';
import QuestionTreeEditor from '@/components/examV2/QuestionTreeEditor.jsx';
import AdmissionOverridesEditor from '@/components/examV2/AdmissionOverridesEditor.jsx';
import InlineProofPreviewDialog from '@/components/examV2/InlineProofPreviewDialog.jsx';
import ExamV2ImportDialog from '@/components/examV2/ExamV2ImportDialog.jsx';
import PrintExamV2Dialog from '@/components/examV2/PrintExamV2Dialog.jsx';
import { collectDescendantIds, getJointLabel, getProofDisplayName, getProofTypeLabel, parseIdsField, truncateGroupLabel } from '@/lib/examV2Utils';

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

function getStoredExamV2Setting(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  return value ?? fallback;
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [leftColumnCollapsed, setLeftColumnCollapsed] = useState(false);

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
  const availableAttachmentProofs = useMemo(
    () => selectedRootProof
      ? [selectedRootProof, ...proofs.filter((proof) => proof.parent_proof_id === selectedRootProof.id)]
      : proofs.filter((proof) => proof.proof_category === 'Deposition' || ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)),
    [proofs, selectedRootProof]
  );
  const admissionStatusMeta = selectedRootProof?.status === 'Admitted'
    ? { label: `Admitted as Exhibit · #${selectedRootProof.admitted_exhibit_num || '—'}`, color: 'text-red-400' }
    : selectedRootProof?.status === 'Demonstrative'
      ? { label: `Admitted as Demonstrative · #${selectedRootProof.demonstrative_exhibit_num || selectedRootProof.joint_exhibit_num || '—'}`, color: 'text-blue-400' }
      : null;
  const selectableProofs = useMemo(
    () => proofs.filter((proof) => ['Extract', 'Video', 'Image'].includes(proof.proof_child_type || proof.file_type)),
    [proofs]
  );

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

  const deleteItem = async (item) => {
    const descendantIds = collectDescendantIds(currentItems, item.id);
    await Promise.all([...descendantIds, item.id].map((id) => base44.entities.ExamItemV2.delete(id)));
    invalidate();
  };

  const handleImportExamData = async (importedRootItems) => {
    if (!selectedPartyId) {
      throw new Error('Select a party before importing.');
    }

    const exam = await ensureExam();
    const createdRootIds = [];
    const baseSortOrder = rootItems.length;
    const normalizeQuestionKey = (value) => String(value || '').trim().toLowerCase();

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

      const topLevelRows = questionRows.filter((row) => !row.parent_question_text);
      const childRows = questionRows.filter((row) => row.parent_question_text);
      const createdQuestionIdsByKey = {};
      const childOrderByParentId = {};
      const baseQuestionSortOrder = importedRoot.item_type === 'proof' ? 1 : 0;

      for (const [questionIndex, row] of topLevelRows.entries()) {
        const createdQuestion = await base44.entities.ExamItemV2.create({
          exam_id: exam.id,
          item_type: 'question',
          parent_item_id: createdRootItem.id,
          sort_order: baseQuestionSortOrder + questionIndex,
          text: row.question_text,
          expected_answer: row.expected_answer || '',
          notes: row.notes || '',
          attached_proof_ids: row.attached_proof_ids?.length ? { ids: row.attached_proof_ids } : null,
        });

        const key = normalizeQuestionKey(row.question_text);
        if (key) createdQuestionIdsByKey[key] = createdQuestion.id;
      }

      for (const row of childRows) {
        const parentQuestionId = createdQuestionIdsByKey[normalizeQuestionKey(row.parent_question_text)];
        if (!parentQuestionId) {
          throw new Error(`Parent question "${row.parent_question_text}" was not found inside exam order ${importedRoot.exam_order}.`);
        }

        const childSortOrder = childOrderByParentId[parentQuestionId] || 0;
        const createdQuestion = await base44.entities.ExamItemV2.create({
          exam_id: exam.id,
          item_type: 'question',
          parent_item_id: parentQuestionId,
          sort_order: childSortOrder,
          text: row.question_text,
          expected_answer: row.expected_answer || '',
          notes: row.notes || '',
          attached_proof_ids: row.attached_proof_ids?.length ? { ids: row.attached_proof_ids } : null,
        });

        childOrderByParentId[parentQuestionId] = childSortOrder + 1;
        const key = normalizeQuestionKey(row.question_text);
        if (key) createdQuestionIdsByKey[key] = createdQuestion.id;
      }
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

    const updates = [
      ...nextSource.map((item, index) => ({ id: item.id, patch: { sort_order: index, parent_item_id: sourceParentId } })),
      ...nextDest.map((item, index) => ({ id: item.id, patch: { sort_order: index, parent_item_id: destParentId } })),
    ];

    await Promise.all(updates.map((updateItem) => base44.entities.ExamItemV2.update(updateItem.id, updateItem.patch)));
    invalidate();
  };

  const onDragEnd = async ({ source, destination, draggableId, type }) => {
    if (!destination) return;
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
              <option value="">Select party</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
            </ToolbarSelect>
            <ToolbarSelect value={selectedExamType} onChange={setSelectedExamType}>
              <option value="Direct">Direct</option>
              <option value="Cross">Cross</option>
            </ToolbarSelect>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setPickerOpen(true)}>Add Joint Proof</Button>
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => setGroupDialog({ open: true, initialItem: null })}>Add Question Group</Button>
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-2" onClick={() => setImportDialogOpen(true)} disabled={!selectedPartyId}>
              <Upload className="w-4 h-4" /> Import Excel
            </Button>
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-2" onClick={() => setPrintDialogOpen(true)} disabled={rootItems.length === 0}>
              <Printer className="w-4 h-4" /> Print Exam
            </Button>
            {!currentExam && selectedPartyId && <span className="text-xs text-slate-500">Choose an item action to create this V2 exam.</span>}
          </div>

          <div className={`grid grid-cols-1 min-h-[calc(100vh-10rem)] ${leftColumnCollapsed ? 'xl:grid-cols-[4.5rem_1fr]' : 'xl:grid-cols-[22rem_1fr]'}`}>
            <div className="border-r border-slate-800 p-4 min-h-0 overflow-y-auto">
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
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
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
                                    {proof ? <ProofThumbPreview proof={proof} size="md" /> : <ProofThumbPreview groupLabel={item.label} size="md" />}
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
                    <div className="flex items-center gap-2">
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

        <ProofPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} proofs={selectableProofs} parties={parties} onSelect={addProofToExam} />
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
          title={questionDialog.title}
        />
        <InlineProofPreviewDialog
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
        <ExamV2ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          selectedParty={selectedParty}
          selectedExamType={selectedExamType}
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