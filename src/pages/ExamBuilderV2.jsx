import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, ScrollText, Trash2 } from 'lucide-react';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import GroupPreviewPane from '@/components/attorneyHub/GroupPreviewPane.jsx';
import ProofPickerDialog from '@/components/examV2/ProofPickerDialog.jsx';
import GroupEditorDialog from '@/components/examV2/GroupEditorDialog.jsx';
import QuestionEditorDialog from '@/components/examV2/QuestionEditorDialog.jsx';
import QuestionTreeEditor from '@/components/examV2/QuestionTreeEditor.jsx';
import AdmissionOverridesEditor from '@/components/examV2/AdmissionOverridesEditor.jsx';
import { collectDescendantIds, getJointLabel, getProofDisplayName, getProofTypeLabel, parseIdsField, truncateGroupLabel } from '@/lib/examV2Utils';

function ToolbarSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
      {children}
    </select>
  );
}

export default function ExamBuilderV2() {
  const queryClient = useQueryClient();
  const { juryState, update } = useJurySync('attorney');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [selectedRootId, setSelectedRootId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [questionDialog, setQuestionDialog] = useState({ open: false, parentId: null, initialValue: null, title: 'Question' });
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [previewProofId, setPreviewProofId] = useState('');

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
  const availableAttachmentProofs = useMemo(() => selectedRootProof ? [selectedRootProof, ...proofs.filter((proof) => proof.parent_proof_id === selectedRootProof.id)] : [], [proofs, selectedRootProof]);
  const selectableProofs = useMemo(() => {
    const allExhibits = proofs.filter((proof) => proof.proof_category === 'Exhibit');
    const allDepositions = proofs.filter((proof) => proof.proof_category === 'Deposition');
    const exhibitsTopLevel = allExhibits.filter((proof) => !proof.parent_proof_id);
    const promotedExtracts = allExhibits.filter(
      (proof) => proof.proof_child_type === 'Extract' && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)
    );

    return [
      ...exhibitsTopLevel.filter((proof) => ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)),
      ...promotedExtracts,
      ...allDepositions.filter((proof) => !proof.parent_proof_id),
    ];
  }, [proofs]);
  const previewProof = proofsById[previewProofId] || selectedRootProof || null;

  useEffect(() => {
    if (!selectedPartyId && parties[0]) setSelectedPartyId(parties[0].id);
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
    if (selectedRootProof) setPreviewProofId(selectedRootProof.id);
    if (!selectedRootProof && selectedRoot?.item_type === 'group') setPreviewProofId('');
  }, [selectedRootProof, selectedRoot?.id]);

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

  const addProofToExam = async (proof) => {
    await createRootItem({ item_type: 'proof', linked_proof_id: proof.id, label: getProofDisplayName(proof), step_overrides: {} });
  };

  const addGroupToExam = async (label) => {
    if (!label) return;
    await createRootItem({ item_type: 'group', label: truncateGroupLabel(label) });
  };

  const saveQuestion = async (form) => {
    if (!questionDialog.parentId || !currentExam) return;
    if (questionDialog.initialValue) {
      await base44.entities.ExamItemV2.update(questionDialog.initialValue.id, form);
      invalidate();
      return;
    }

    const siblings = currentItems.filter((item) => item.item_type === 'question' && item.parent_item_id === questionDialog.parentId);
    await base44.entities.ExamItemV2.create({
      exam_id: currentExam.id,
      item_type: 'question',
      parent_item_id: questionDialog.parentId,
      sort_order: siblings.length,
      ...form,
    });
    invalidate();
  };

  const deleteItem = async (item) => {
    const descendantIds = collectDescendantIds(currentItems, item.id);
    await Promise.all([...descendantIds, item.id].map((id) => base44.entities.ExamItemV2.delete(id)));
    invalidate();
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
    const sourceSiblings = currentItems.filter((item) => item.item_type === 'question' && item.parent_item_id === sourceParentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const destSiblings = sourceParentId === destParentId ? sourceSiblings : currentItems.filter((item) => item.item_type === 'question' && item.parent_item_id === destParentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const moved = currentItems.find((item) => item.id === draggableId);
    const nextSource = [...sourceSiblings];
    nextSource.splice(source.index, 1);

    const nextDest = sourceParentId === destParentId ? nextSource : [...destSiblings];
    nextDest.splice(destination.index, 0, moved);

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
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => setGroupOpen(true)}>Add Question Group</Button>
            {!currentExam && selectedPartyId && <span className="text-xs text-slate-400">Choose an item action to create this V2 exam.</span>}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[22rem_1fr] min-h-[calc(100vh-10rem)]">
            <div className="border-r border-slate-800 p-4 min-h-0 overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Exam Order</p>
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
                                <button type="button" {...dragProvided.dragHandleProps} className="mt-1 text-slate-500 hover:text-white">
                                  <GripVertical className="w-4 h-4" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  {proof ? <ProofThumbPreview proof={proof} size="sm" /> : <ProofThumbPreview groupLabel={item.label} size="sm" />}
                                </div>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={(event) => { event.stopPropagation(); deleteItem(item); }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <p className="mt-3 text-sm font-semibold text-white leading-snug">{proof ? getProofDisplayName(proof) : item.label}</p>
                              <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                                <span className="text-green-400 font-semibold">{proof ? getJointLabel(proof) : 'Group'}</span>
                                <span className="text-slate-500">{proof ? getProofTypeLabel(proof) : 'No Proof'}</span>
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
            </div>

            <div className="grid grid-rows-[minmax(22rem,30rem)_1fr] min-h-0">
              <div className="border-b border-slate-800 p-4 min-h-0">
                {selectedRoot ? (
                  <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(16rem,22rem)_1fr] gap-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected Item</p>
                          <p className="mt-2 text-lg font-semibold text-white">{selectedRootProof ? getProofDisplayName(selectedRootProof) : selectedRoot.label}</p>
                        </div>
                        {selectedRootProof && (
                          <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => setOverridesOpen(true)}>
                            <ScrollText className="w-4 h-4 mr-2" /> Edit Steps
                          </Button>
                        )}
                      </div>
                      <div className="mt-4 flex-1 overflow-hidden">
                        {selectedRootProof ? (
                          <div className="h-full rounded-xl border border-slate-800 overflow-hidden">
                            <ProofPreviewPane
                              proof={previewProof}
                              juryState={juryState}
                              onUpdateJury={update}
                              onRuling={({ proofId, data }) => base44.entities.Proof.update(proofId, data)}
                              onClose={() => setPreviewProofId(selectedRootProof.id)}
                            />
                          </div>
                        ) : (
                          <GroupPreviewPane label={selectedRoot.label} />
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 overflow-y-auto">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question Builder</p>
                          <p className="mt-1 text-sm text-slate-400">Add parent questions and follow-up children in drag-and-drop order.</p>
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setQuestionDialog({ open: true, parentId: selectedRoot.id, initialValue: null, title: 'Add Question' })}>
                          <Plus className="w-4 h-4 mr-2" /> Add Question
                        </Button>
                      </div>
                      <QuestionTreeEditor
                        parentId={selectedRoot.id}
                        rootParentId={selectedRoot.id}
                        items={currentItems.filter((item) => item.item_type === 'question')}
                        proofsById={proofsById}
                        onEdit={(item) => setQuestionDialog({ open: true, parentId: item.parent_item_id, initialValue: { ...item, attached_proof_ids: parseIdsField(item.attached_proof_ids) }, title: 'Edit Question' })}
                        onAddFollowup={(item) => setQuestionDialog({ open: true, parentId: item.id, initialValue: null, title: 'Add Follow-up' })}
                        onDelete={deleteItem}
                        onSelectAttachment={(proof) => setPreviewProofId(proof.id)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-slate-500">Add a proof or question group to begin your V2 exam.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ProofPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} proofs={selectableProofs} onSelect={addProofToExam} />
        <GroupEditorDialog open={groupOpen} onOpenChange={setGroupOpen} onSave={addGroupToExam} />
        <QuestionEditorDialog
          open={questionDialog.open}
          onOpenChange={(open) => setQuestionDialog((prev) => ({ ...prev, open }))}
          onSave={saveQuestion}
          initialValue={questionDialog.initialValue}
          availableProofs={availableAttachmentProofs}
          title={questionDialog.title}
        />
        <AdmissionOverridesEditor
          open={overridesOpen}
          onOpenChange={setOverridesOpen}
          sourceBlock={selectedRootProof ? { proof_type_category_id: selectedRootProof.proof_type_category_id, step_overrides: selectedRoot?.step_overrides || {} } : null}
          templates={admissionTemplates}
          exhibitNum={selectedRootProof?.joint_exhibit_num || ''}
          onSave={(step_overrides) => base44.entities.ExamItemV2.update(selectedRoot.id, { step_overrides }).then(invalidate)}
        />
      </div>
    </DragDropContext>
  );
}