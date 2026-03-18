import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, FolderOpen, Layers3 } from 'lucide-react';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import ProofCardMenu from '@/components/attorneyHub/ProofCardMenu.jsx';
import AttorneyHubQuestionList from '@/components/attorneyHub/AttorneyHubQuestionList.jsx';
import GroupPreviewPane from '@/components/attorneyHub/GroupPreviewPane.jsx';
import { getJointLabel, getProofDisplayName, getProofSide, getProofTypeLabel, sortByJointExhibit } from '@/lib/examV2Utils';

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
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [proofTab, setProofTab] = useState('Exhibits');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [orderMode, setOrderMode] = useState('joint');
  const [selectedKey, setSelectedKey] = useState('');
  const [localDecisionMap, setLocalDecisionMap] = useState({});

  const { data: parties = [] } = useQuery({ queryKey: ['hubParties'], queryFn: () => base44.entities.Party.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['hubProofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: exams = [] } = useQuery({ queryKey: ['hubExamsV2'], queryFn: () => base44.entities.ExamV2.list() });
  const { data: examItems = [] } = useQuery({ queryKey: ['hubExamItemsV2'], queryFn: () => base44.entities.ExamItemV2.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['hubAdmissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });
  const { data: admissionBlocks = [] } = useQuery({ queryKey: ['hubAdmissionBlocks'], queryFn: () => base44.entities.AdmissionBlock.list() });

  const selectedParty = parties.find((party) => party.id === selectedPartyId) || null;
  const currentExam = exams.find((exam) => exam.party_id === selectedPartyId && exam.exam_type === selectedExamType) || null;
  const currentExamItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootProofItems = useMemo(() => currentExamItems.filter((item) => item.item_type === 'proof' && !item.parent_item_id), [currentExamItems]);
  const rootGroups = useMemo(() => currentExamItems.filter((item) => item.item_type === 'group' && !item.parent_item_id), [currentExamItems]);
  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const rootProofOrderMap = useMemo(() => Object.fromEntries(rootProofItems.map((item) => [item.linked_proof_id, item.sort_order || 0])), [rootProofItems]);

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
    const baseList = proofTab === 'Depositions' ? parentDepositions : parentExhibits;
    let next = [...baseList];

    if (statusFilter !== 'all' && proofTab !== 'Depositions') {
      next = next.filter((proof) => {
        if (statusFilter === 'demonstrative') return proof.status === 'Demonstrative';
        return proof.status.toLowerCase() === statusFilter;
      });
    }

    if (statusFilter === 'linked') {
      next = next.filter((proof) => rootProofItems.some((item) => item.linked_proof_id === proof.id));
    }

    if (statusFilter === 'unlinked') {
      next = next.filter((proof) => !rootProofItems.some((item) => item.linked_proof_id === proof.id));
    }

    if (sideFilter !== 'all') {
      next = next.filter((proof) => getProofSide(proof) === sideFilter);
    }

    if (orderMode === 'exam') {
      next.sort((a, b) => {
        const aOrder = rootProofOrderMap[a.id];
        const bOrder = rootProofOrderMap[b.id];
        if (aOrder === undefined && bOrder === undefined) return getJointLabel(a).localeCompare(getJointLabel(b), undefined, { numeric: true });
        if (aOrder === undefined) return 1;
        if (bOrder === undefined) return -1;
        return aOrder - bOrder;
      });
      return next;
    }

    return sortByJointExhibit(next);
  }, [orderMode, parentDepositions, parentExhibits, proofTab, rootProofItems, rootProofOrderMap, sideFilter, statusFilter]);

  const displayEntries = useMemo(() => {
    const proofEntries = filteredProofs.map((proof) => ({ kind: 'proof', id: proof.id }));
    if (proofTab === 'Depositions') return proofEntries;
    const groupEntries = rootGroups.map((item) => ({ kind: 'group', id: item.id }));
    return [...proofEntries, ...groupEntries];
  }, [filteredProofs, proofTab, rootGroups]);

  useEffect(() => {
    if (!selectedPartyId && parties[0]) setSelectedPartyId(parties[0].id);
  }, [parties, selectedPartyId]);

  useEffect(() => {
    if (!displayEntries.length) {
      setSelectedKey('');
      return;
    }
    const stillExists = displayEntries.some((entry) => `${entry.kind}:${entry.id}` === selectedKey);
    if (!stillExists) setSelectedKey(`${displayEntries[0].kind}:${displayEntries[0].id}`);
  }, [displayEntries, selectedKey]);

  const [selectedKind, selectedId] = selectedKey.split(':');
  const selectedProof = selectedKind === 'proof' ? proofsById[selectedId] : null;
  const selectedGroup = selectedKind === 'group' ? rootGroups.find((item) => item.id === selectedId) || null : null;
  const selectedProofRootItem = selectedProof ? rootProofItems.find((item) => item.linked_proof_id === selectedProof.id) || null : null;
  const fallbackAdmissionBlock = selectedProof ? admissionBlocks.find((item) => item.proof_id === selectedProof.id && item.party_id === selectedPartyId) || null : null;
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
        <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap items-center gap-2">
          <ToolbarSelect value={selectedPartyId} onChange={setSelectedPartyId}>
            <option value="">Select party</option>
            {parties.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
          </ToolbarSelect>
          <ToolbarSelect value={selectedExamType} onChange={setSelectedExamType}>
            <option value="Direct">Direct</option>
            <option value="Cross">Cross</option>
          </ToolbarSelect>
          <ToolbarSelect value={orderMode} onChange={setOrderMode}>
            <option value="joint">Joint Exhibit #</option>
            <option value="exam">Exam Order</option>
          </ToolbarSelect>
          <ToolbarSelect value={sideFilter} onChange={setSideFilter}>
            <option value="all">All Sides</option>
            <option value="Plaintiff">Plaintiff</option>
            <option value="Defense">Defense</option>
          </ToolbarSelect>
          <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All Status</option>
            <option value="joint">Joint</option>
            <option value="admitted">Admitted</option>
            <option value="demonstrative">Demonstrative</option>
            <option value="linked">In Exam</option>
            <option value="unlinked">Not In Exam</option>
          </ToolbarSelect>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.35fr] min-h-[calc(100vh-10rem)]">
          <div className="border-r border-slate-800 flex flex-col min-h-0">
            <div className="border-b border-slate-800 px-4 pt-4">
              <div className="inline-flex rounded-lg bg-slate-950 p-1 gap-1 mb-4">
                {['Exhibits', 'Depositions'].map((tab) => (
                  <button key={tab} type="button" onClick={() => setProofTab(tab)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${proofTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-rows-[1fr_22rem]">
              <div className="overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-3">
                  {displayEntries.map((entry) => {
                    const isSelected = selectedKey === `${entry.kind}:${entry.id}`;
                    if (entry.kind === 'group') {
                      const group = rootGroups.find((item) => item.id === entry.id);
                      return (
                        <div key={entry.id} onClick={() => setSelectedKey(`group:${entry.id}`)} className={`rounded-2xl border p-3 text-left cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <ProofThumbPreview groupLabel={group?.label || 'No Proof'} size="md" />
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Group</span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-white leading-snug">{group?.label || 'Untitled Group'}</p>
                        </div>
                      );
                    }

                    const proof = proofsById[entry.id];
                    const children = proofs.filter((item) => item.parent_proof_id === proof.id);
                    const isDemo = proof.status === 'Demonstrative';
                    const isAdmitted = proof.status === 'Admitted';

                    return (
                      <div key={proof.id} onClick={() => setSelectedKey(`proof:${proof.id}`)} className={`rounded-2xl border p-3 text-left cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <ProofThumbPreview proof={proof} size="md" />
                          <div className="flex flex-col items-end gap-2">
                            {(isAdmitted || isDemo) && (
                              <CheckCircle2 className={`w-5 h-5 ${isDemo ? 'text-blue-400' : 'text-red-400'}`} />
                            )}
                            <ProofCardMenu proof={proof} selectedParty={selectedParty} localDecision={localDecisionMap[proof.id]} onAction={(action, patch) => handleProofAction(proof, action, patch)} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-green-400">{getJointLabel(proof)}</span>
                          <span className="text-slate-500">{getProofTypeLabel(proof)}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white leading-snug">{proof.name || getProofDisplayName(proof)}</p>
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
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-800 p-4 min-h-0">
                <AttorneyHubQuestionList
                  title={selectedProof ? getProofDisplayName(selectedProof) : selectedGroup?.label}
                  parentItemId={questionParentId}
                  questionItems={questionItems}
                  proofsById={proofsById}
                  admissionSource={selectedProof ? admissionSource : null}
                  admissionTemplates={admissionTemplates}
                  exhibitNum={selectedProof?.joint_exhibit_num || selectedProof?.admitted_exhibit_num || ''}
                  onSelectInlineProof={(proof) => setSelectedKey(`proof:${proof.id}`)}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 p-4">
            {selectedProof ? (
              <div className="h-full min-h-[42rem] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <ProofPreviewPane
                  proof={selectedProof}
                  juryState={juryState}
                  onUpdateJury={update}
                  onRuling={({ proofId, data }) => updateProofMutation.mutate({ proofId, data })}
                  onClose={() => setSelectedKey('')}
                />
              </div>
            ) : selectedGroup ? (
              <div className="h-full min-h-[42rem] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden p-4">
                <AttorneyHubQuestionList
                  title={selectedGroup.label}
                  parentItemId={selectedGroup.id}
                  questionItems={questionItems}
                  proofsById={proofsById}
                  admissionSource={null}
                  admissionTemplates={admissionTemplates}
                  exhibitNum=""
                  onSelectInlineProof={(proof) => setSelectedKey(`proof:${proof.id}`)}
                />
              </div>
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