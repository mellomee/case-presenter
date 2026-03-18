import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Layers3, LayoutGrid, List } from 'lucide-react';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import ProofCardMenu from '@/components/attorneyHub/ProofCardMenu.jsx';
import AttorneyHubQuestionList from '@/components/attorneyHub/AttorneyHubQuestionList.jsx';
import GroupPreviewPane from '@/components/attorneyHub/GroupPreviewPane.jsx';
import ColumnResizeHandle from '@/components/attorneyHub/ColumnResizeHandle.jsx';
import useStoredSplitWidths from '@/hooks/useStoredSplitWidths';
import { getJointLabel, getProofDisplayName, getProofSide, getProofTypeLabel, parseIdsField, sortByJointExhibit } from '@/lib/examV2Utils';

function proofMatchesParty(proof, partyId) {
  if (!partyId || partyId === 'all') return true;
  const attachedPartyIds = parseIdsField(proof?.party_ids);
  return attachedPartyIds.includes(partyId) || proof?.party_id === partyId;
}

function getStoredHubSetting(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  return value ?? fallback;
}

function ToolbarSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
      {children}
    </select>
  );
}

export default function AttorneyHub() {
  const queryClient = useQueryClient();
  const { juryState, update } = useJurySync('attorney');
  const [selectedExamType, setSelectedExamType] = useState(() => getStoredHubSetting('attorney-hub-exam-type', 'Direct'));
  const [proofTab, setProofTab] = useState(() => getStoredHubSetting('attorney-hub-tab', 'Exam'));
  const [selectedExamPartyId, setSelectedExamPartyId] = useState(() => getStoredHubSetting('attorney-hub-exam-party', ''));
  const [depositionPartyFilter, setDepositionPartyFilter] = useState(() => getStoredHubSetting('attorney-hub-deposition-party', 'all'));
  const [statusFilter, setStatusFilter] = useState(() => getStoredHubSetting('attorney-hub-status', 'all'));
  const [sideFilter, setSideFilter] = useState(() => getStoredHubSetting('attorney-hub-side', 'all'));
  const [viewMode, setViewMode] = useState(() => getStoredHubSetting('attorney-hub-view-mode', 'list'));
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedPreviewProof, setSelectedPreviewProof] = useState(null);
  const [localDecisionMap, setLocalDecisionMap] = useState({});
  const { widths, startDrag } = useStoredSplitWidths('attorney-hub-split-widths', {
    left: 430,
    middle: 360,
    right: 620,
  });

  const { data: parties = [] } = useQuery({ queryKey: ['hubParties'], queryFn: () => base44.entities.Party.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['hubProofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: exams = [] } = useQuery({ queryKey: ['hubExamsV2'], queryFn: () => base44.entities.ExamV2.list() });
  const { data: examItems = [] } = useQuery({ queryKey: ['hubExamItemsV2'], queryFn: () => base44.entities.ExamItemV2.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['hubAdmissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });
  const { data: admissionBlocks = [] } = useQuery({ queryKey: ['hubAdmissionBlocks'], queryFn: () => base44.entities.AdmissionBlock.list() });

  const activePartyId = proofTab === 'Exam'
    ? selectedExamPartyId
    : proofTab === 'Depositions'
      ? (depositionPartyFilter === 'all' ? '' : depositionPartyFilter)
      : '';
  const selectedParty = parties.find((party) => party.id === activePartyId) || null;
  const currentExam = exams.find((exam) => exam.party_id === selectedExamPartyId && exam.exam_type === selectedExamType) || null;
  const currentExamItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootProofItems = useMemo(() => currentExamItems.filter((item) => item.item_type === 'proof' && !item.parent_item_id), [currentExamItems]);
  const rootGroups = useMemo(() => currentExamItems.filter((item) => item.item_type === 'group' && !item.parent_item_id), [currentExamItems]);
  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const rootProofOrderMap = useMemo(() => Object.fromEntries(rootProofItems.map((item) => [item.linked_proof_id, item.sort_order || 0])), [rootProofItems]);
  const rootExamOrderNumberMap = useMemo(() => {
    const orderedRootItems = currentExamItems
      .filter((item) => !item.parent_item_id && item.item_type !== 'question')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return Object.fromEntries(orderedRootItems.map((item, index) => [item.id, index + 1]));
  }, [currentExamItems]);
  const rootProofOrderNumberMap = useMemo(
    () => Object.fromEntries(rootProofItems.map((item) => [item.linked_proof_id, rootExamOrderNumberMap[item.id]])),
    [rootProofItems, rootExamOrderNumberMap]
  );

  const updateProofMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hubProofs'] }),
  });

  const parentExhibits = useMemo(() => {
    const allExhibits = proofs.filter((proof) => proof.proof_category === 'Exhibit');
    const promotedExtracts = allExhibits.filter(
      (proof) => proof.proof_child_type === 'Extract' && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)
    );

    return [
      ...allExhibits.filter((proof) => !proof.parent_proof_id && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)),
      ...promotedExtracts,
    ];
  }, [proofs]);
  const parentDepositions = useMemo(() => proofs.filter((proof) => !proof.parent_proof_id && proof.proof_category === 'Deposition'), [proofs]);

  const filteredProofs = useMemo(() => {
    if (proofTab === 'Depositions') {
      return parentDepositions.filter((proof) => proofMatchesParty(proof, depositionPartyFilter));
    }

    if (proofTab === 'Exam') {
      if (!currentExam) return [];
      return rootProofItems
        .map((item) => proofsById[item.linked_proof_id])
        .filter(Boolean);
    }

    let next = [...parentExhibits];

    if (statusFilter !== 'all') {
      next = next.filter((proof) => {
        if (statusFilter === 'joint') return proof.status === 'Joint';
        if (statusFilter === 'admitted') return proof.status === 'Admitted';
        if (statusFilter === 'demonstrative') return proof.status === 'Demonstrative';
        return true;
      });
    }

    if (sideFilter !== 'all') {
      next = next.filter((proof) => getProofSide(proof) === sideFilter);
    }

    return sortByJointExhibit(next);
  }, [currentExam, depositionPartyFilter, parentDepositions, parentExhibits, proofTab, proofsById, rootProofItems, sideFilter, statusFilter]);

  const displayEntries = useMemo(() => {
    const proofEntries = filteredProofs.map((proof) => ({ kind: 'proof', id: proof.id }));
    if (proofTab === 'Depositions' || proofTab === 'Exhibits') return proofEntries;

    return currentExamItems
      .filter((item) => !item.parent_item_id && item.item_type !== 'question')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .flatMap((item) => {
        if (item.item_type === 'group') return [{ kind: 'group', id: item.id }];
        if (item.item_type === 'proof') return [{ kind: 'proof', id: item.linked_proof_id }];
        return [];
      });
  }, [currentExamItems, filteredProofs, proofTab]);

  useEffect(() => {
    if (!displayEntries.length) {
      setSelectedKey('');
      return;
    }
    const stillExists = displayEntries.some((entry) => `${entry.kind}:${entry.id}` === selectedKey);
    if (!stillExists) setSelectedKey(`${displayEntries[0].kind}:${displayEntries[0].id}`);
  }, [displayEntries, selectedKey]);

  useEffect(() => {
    setSelectedPreviewProof(null);
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedExamPartyId && parties[0]) {
      setSelectedExamPartyId(parties[0].id);
    }
  }, [parties, selectedExamPartyId]);

  useEffect(() => {
    window.localStorage.setItem('attorney-hub-tab', proofTab);
    window.localStorage.setItem('attorney-hub-exam-type', selectedExamType);
    window.localStorage.setItem('attorney-hub-exam-party', selectedExamPartyId || '');
    window.localStorage.setItem('attorney-hub-deposition-party', depositionPartyFilter);
    window.localStorage.setItem('attorney-hub-status', statusFilter);
    window.localStorage.setItem('attorney-hub-side', sideFilter);
    window.localStorage.setItem('attorney-hub-view-mode', viewMode);
  }, [proofTab, selectedExamType, selectedExamPartyId, depositionPartyFilter, statusFilter, sideFilter, viewMode]);

  const [selectedKind, selectedId] = selectedKey.split(':');
  const selectedProof = selectedKind === 'proof' ? proofsById[selectedId] : null;
  const selectedGroup = selectedKind === 'group' ? rootGroups.find((item) => item.id === selectedId) || null : null;
  const selectedProofRootItem = selectedProof ? rootProofItems.find((item) => item.linked_proof_id === selectedProof.id) || null : null;
  const fallbackAdmissionBlock = selectedProof ? admissionBlocks.find((item) => item.proof_id === selectedProof.id && item.party_id === activePartyId) || null : null;
  const admissionSource = selectedProof
    ? selectedProofRootItem?.step_overrides
      ? { proof_type_category_id: selectedProof.proof_type_category_id, step_overrides: selectedProofRootItem.step_overrides }
      : fallbackAdmissionBlock || { proof_type_category_id: selectedProof.proof_type_category_id, step_overrides: {} }
    : null;
  const questionParentId = selectedProof ? selectedProofRootItem?.id : selectedGroup?.id;
  const questionItems = useMemo(() => currentExamItems.filter((item) => item.item_type === 'question'), [currentExamItems]);

  const handleProofAction = (proof, action, patch = null) => {
    if (action === 'not_admitted') {
      setLocalDecisionMap((prev) => ({ ...prev, [proof.id]: prev[proof.id] === 'not_admitted' ? null : 'not_admitted' }));
      return;
    }
    setLocalDecisionMap((prev) => ({ ...prev, [proof.id]: null }));
    updateProofMutation.mutate({ proofId: proof.id, data: patch });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap items-center gap-2" />

        <div className="min-h-[calc(100vh-10rem)] xl:flex xl:min-w-0">
          <div style={{ width: `${widths.left}px` }} className="border-r border-slate-800 flex flex-col min-h-0 xl:flex-shrink-0 xl:min-w-[320px]">
            <div className="border-b border-slate-800 px-4 pt-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="inline-flex rounded-lg bg-slate-950 p-1 gap-1">
                  {['Exam', 'Exhibits', 'Depositions'].map((tab) => (
                    <button key={tab} type="button" onClick={() => setProofTab(tab)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${proofTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`h-9 w-9 rounded-md flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Thumbnail view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`h-9 w-9 rounded-md flex items-center justify-center ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {proofTab === 'Exam' ? (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <ToolbarSelect value={selectedExamPartyId} onChange={setSelectedExamPartyId}>
                    <option value="">Select party</option>
                    {parties.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
                  </ToolbarSelect>
                  <ToolbarSelect value={selectedExamType} onChange={setSelectedExamType}>
                    <option value="Direct">Direct</option>
                    <option value="Cross">Cross</option>
                  </ToolbarSelect>
                </div>
              ) : proofTab === 'Exhibits' ? (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                    <option value="all">All Joint/Admitted/Demo</option>
                    <option value="joint">Joint Only</option>
                    <option value="admitted">Admitted Exhibits</option>
                    <option value="demonstrative">Demonstratives</option>
                  </ToolbarSelect>
                  <ToolbarSelect value={sideFilter} onChange={setSideFilter}>
                    <option value="all">All Sides</option>
                    <option value="Plaintiff">Plaintiff</option>
                    <option value="Defense">Defense</option>
                  </ToolbarSelect>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <ToolbarSelect value={depositionPartyFilter} onChange={setDepositionPartyFilter}>
                    <option value="all">All Parties</option>
                    {parties.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
                  </ToolbarSelect>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                {displayEntries.map((entry) => {
                    const isSelected = selectedKey === `${entry.kind}:${entry.id}`;
                    if (entry.kind === 'group') {
                      const group = rootGroups.find((item) => item.id === entry.id);
                      return (
                        <div key={entry.id} onClick={() => setSelectedKey(`group:${entry.id}`)} className={`rounded-2xl border p-3 text-left cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'} ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
                          <div className={`flex items-start justify-between gap-3 ${viewMode === 'list' ? 'w-full' : ''}`}>
                            <div className="flex items-center gap-4 min-w-0">
                              <ProofThumbPreview groupLabel={group?.label || 'No Proof'} size={viewMode === 'grid' ? 'md' : 'sm'} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {rootExamOrderNumberMap[group?.id] && (
                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600/20 px-1.5 text-[11px] font-semibold text-blue-300">{rootExamOrderNumberMap[group.id]}</span>
                                  )}
                                  <p className="text-sm font-semibold text-white leading-snug">{group?.label || 'Untitled Group'}</p>
                                </div>
                                {viewMode === 'list' && <p className="mt-1 text-xs text-slate-400">Question Group</p>}
                               {viewMode === 'grid' && <p className="mt-2 text-[11px] text-slate-400">No Proof</p>}
                              </div>
                            </div>
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Group</span>
                          </div>
                        </div>
                      );
                    }

                    const proof = proofsById[entry.id];
                    const children = proofs.filter((item) => item.parent_proof_id === proof.id);
                    const isDemo = proof.status === 'Demonstrative';
                    const isAdmitted = proof.status === 'Admitted';

                    return (
                      <div key={proof.id} onClick={() => setSelectedKey(`proof:${proof.id}`)} className={`rounded-2xl border p-3 text-left cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'} ${viewMode === 'list' ? 'flex items-start gap-4' : ''}`}>
                        <div className={`flex items-start justify-between gap-2 ${viewMode === 'list' ? 'w-full' : ''}`}>
                          <div className="flex items-start gap-4 min-w-0">
                            <ProofThumbPreview proof={proof} size={viewMode === 'grid' ? 'md' : 'sm'} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {rootProofOrderNumberMap[proof.id] && (
                                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600/20 px-1.5 text-[11px] font-semibold text-blue-300">{rootProofOrderNumberMap[proof.id]}</span>
                                )}
                                <p className="text-sm font-semibold text-white leading-snug">{proof.name || getProofDisplayName(proof)}</p>
                              </div>
                              <div className={`mt-2 flex items-center ${viewMode === 'grid' ? 'justify-between' : 'justify-start gap-3'} text-xs`}>
                                <span className="font-semibold text-green-400">{getJointLabel(proof)}</span>
                                <span className="text-slate-500">{proof.status === 'Admitted' ? (proof.admitted_exhibit_num || '—') : proof.status === 'Demonstrative' ? (proof.demonstrative_exhibit_num || '—') : getProofTypeLabel(proof)}</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">{proof.status}{localDecisionMap[proof.id] === 'not_admitted' ? ' · Not Admitted' : ''}</p>
                              {proofTab === 'Depositions' && children.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {children.slice(0, 4).map((child) => (
                                    <button key={child.id} type="button" onClick={(event) => { event.stopPropagation(); setSelectedKey(`proof:${child.id}`); }} className="rounded-lg border border-slate-700 bg-slate-900/70 p-1.5 hover:border-blue-500">
                                      <ProofThumbPreview proof={child} size="sm" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {(isAdmitted || isDemo) && (
                              <CheckCircle2 className={`w-5 h-5 ${isDemo ? 'text-blue-400' : 'text-red-400'}`} />
                            )}
                            <ProofCardMenu proof={proof} selectedParty={selectedParty} localDecision={localDecisionMap[proof.id]} onAction={(action, patch) => handleProofAction(proof, action, patch)} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <ColumnResizeHandle onMouseDown={startDrag.left} />

          <div style={{ width: `${widths.middle}px` }} className="border-r border-slate-800 min-h-0 p-4 xl:flex-shrink-0 xl:min-w-[320px]">
            {(selectedProof || selectedGroup) ? (
              <AttorneyHubQuestionList
                title={selectedProof ? getProofDisplayName(selectedProof) : selectedGroup?.label}
                parentItemId={questionParentId}
                questionItems={questionItems}
                proofsById={proofsById}
                admissionSource={selectedProof ? admissionSource : null}
                admissionTemplates={admissionTemplates}
                exhibitNum={selectedProof?.joint_exhibit_num || selectedProof?.admitted_exhibit_num || ''}
                onSelectInlineProof={(proof) => setSelectedPreviewProof(proof)}
              />
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 flex items-center justify-center text-center p-8">
                <div>
                  <Layers3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-slate-300">Questions</p>
                  <p className="mt-2 text-sm text-slate-500">Select a proof or question group to see its questions here.</p>
                </div>
              </div>
            )}
          </div>

          <ColumnResizeHandle onMouseDown={startDrag.right} />

          <div style={{ width: `${widths.right}px` }} className="min-h-0 p-4 xl:flex-shrink-0 xl:min-w-[420px] xl:flex-1">
            {(selectedPreviewProof || selectedProof) ? (
              <div className="h-full min-h-[42rem] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <ProofPreviewPane
                  proof={selectedPreviewProof || selectedProof}
                  juryState={juryState}
                  onUpdateJury={update}
                  onRuling={({ proofId, data }) => updateProofMutation.mutate({ proofId, data })}
                  onClose={() => setSelectedPreviewProof(null)}
                />
              </div>
            ) : selectedGroup ? (
              <GroupPreviewPane label={selectedGroup.label} />
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 flex items-center justify-center text-center p-10">
                <div>
                  <Layers3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-slate-300">Attorney Hub</p>
                  <p className="mt-2 text-sm text-slate-500">Pick a proof or question group from the left panel to preview it here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}