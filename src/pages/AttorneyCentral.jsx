import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import { useWitnessSync } from '@/components/witnessView/useWitnessSync.jsx';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal';
import { Button } from '@/components/ui/button';
import AttorneyCentralActionBar from '@/components/attorneyCentral/AttorneyCentralActionBar.jsx';
import AttorneyCentralProofPanel from '@/components/attorneyCentral/AttorneyCentralProofPanel.jsx';
import AttorneyCentralQuestionPanel from '@/components/attorneyCentral/AttorneyCentralQuestionPanel.jsx';
import { canPublishToJury, canPublishToWitness, getPublishedLabel, getProofDisplayName, getProofPartyNames, parseIdsField } from '@/components/attorneyCentral/attorneyCentralUtils';

const QUERY_OPTIONS = {
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
};

function compareProofs(a, b) {
  const aLabel = `${a.joint_exhibit_num || a.admitted_exhibit_num || a.demonstrative_exhibit_num || ''} ${a.formal_name || a.name || ''}`;
  const bLabel = `${b.joint_exhibit_num || b.admitted_exhibit_num || b.demonstrative_exhibit_num || ''} ${b.formal_name || b.name || ''}`;
  return aLabel.localeCompare(bLabel, undefined, { numeric: true, sensitivity: 'base' });
}

function flattenProofEntries(proofs) {
  const childrenByParent = proofs.reduce((accumulator, proof) => {
    const key = proof.parent_proof_id || 'root';
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(proof);
    return accumulator;
  }, {});

  Object.values(childrenByParent).forEach((items) => items.sort(compareProofs));

  const entries = [];
  const walk = (proof, depth = 0) => {
    entries.push({ proof, depth });
    (childrenByParent[proof.id] || []).forEach((child) => walk(child, depth + 1));
  };

  (childrenByParent.root || []).forEach((proof) => walk(proof, 0));
  return entries;
}

function matchesProofSearch(proof, partiesById, searchTerm) {
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
  if (!normalizedSearch) return true;

  const partyText = getProofPartyNames(proof, partiesById).join(' ').toLowerCase();
  return [
    proof.name,
    proof.formal_name,
    proof.joint_exhibit_num,
    proof.admitted_exhibit_num,
    proof.demonstrative_exhibit_num,
    proof.draft_exhibit_num,
    partyText,
  ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
}

function buildQuestionRows(items, proofsById, selectedProofId) {
  const childrenByParent = items.reduce((accumulator, item) => {
    const key = item.parent_item_id || 'root';
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(item);
    return accumulator;
  }, {});

  Object.values(childrenByParent).forEach((group) => group.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

  const rows = [];
  const walk = (item, depth = 0) => {
    const attachedProofIds = parseIdsField(item.attached_proof_ids);
    const linkedProofId = item.linked_proof_id || null;
    const linkedProof = linkedProofId ? proofsById[linkedProofId] : null;

    rows.push({
      id: item.id,
      itemType: item.item_type,
      title: item.item_type === 'proof'
        ? getProofDisplayName(linkedProof) || item.label || 'Linked proof'
        : item.label || item.text || 'Untitled item',
      expectedAnswer: item.expected_answer || '',
      depth,
      linkedProofId,
      attachedProofIds,
      isRelated: Boolean(selectedProofId) && (linkedProofId === selectedProofId || attachedProofIds.includes(selectedProofId)),
    });

    (childrenByParent[item.id] || []).forEach((child) => walk(child, depth + 1));
  };

  (childrenByParent.root || []).forEach((item) => walk(item, 0));
  return rows;
}

export default function AttorneyCentral() {
  const queryClient = useQueryClient();
  const { juryState, update } = useJurySync('attorney');
  const { witnessState, update: updateWitness } = useWitnessSync('attorney');
  const [selectedProofId, setSelectedProofId] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [examType, setExamType] = useState('Direct');
  const [search, setSearch] = useState('');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedProofForModal, setSelectedProofForModal] = useState(null);
  const [showAdmitExhibitModal, setShowAdmitExhibitModal] = useState(false);
  const [showAdmitDemoModal, setShowAdmitDemoModal] = useState(false);
  const [showUnAdmitModal, setShowUnAdmitModal] = useState(false);

  const { data: proofs = [] } = useQuery({ queryKey: ['proofs'], queryFn: () => base44.entities.Proof.list(), ...QUERY_OPTIONS });
  const { data: parties = [] } = useQuery({ queryKey: ['attorneyCentralParties'], queryFn: () => base44.entities.Party.list(), ...QUERY_OPTIONS });
  const { data: exams = [] } = useQuery({ queryKey: ['attorneyCentralExams'], queryFn: () => base44.entities.ExamV2.list(), ...QUERY_OPTIONS });
  const { data: examItems = [] } = useQuery({ queryKey: ['attorneyCentralExamItems'], queryFn: () => base44.entities.ExamItemV2.list(), ...QUERY_OPTIONS });

  const partiesById = useMemo(() => Object.fromEntries(parties.map((party) => [party.id, party])), [parties]);
  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const selectedProof = selectedProofId ? proofsById[selectedProofId] || null : null;
  const selectedParty = selectedProof?.party_id ? partiesById[selectedProof.party_id] || null : null;

  const exhibitEntries = useMemo(() => flattenProofEntries(
    proofs.filter((proof) => proof.proof_category === 'Exhibit' && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status))
  ), [proofs]);

  const depositionEntries = useMemo(() => flattenProofEntries(
    proofs.filter((proof) => proof.proof_category === 'Deposition')
  ), [proofs]);

  const filteredExhibitEntries = useMemo(
    () => exhibitEntries.filter(({ proof }) => matchesProofSearch(proof, partiesById, search)),
    [exhibitEntries, partiesById, search]
  );

  const filteredDepositionEntries = useMemo(
    () => depositionEntries.filter(({ proof }) => matchesProofSearch(proof, partiesById, search)),
    [depositionEntries, partiesById, search]
  );

  const selectableProofIds = useMemo(
    () => [...filteredExhibitEntries, ...filteredDepositionEntries].map((entry) => entry.proof.id),
    [filteredDepositionEntries, filteredExhibitEntries]
  );

  useEffect(() => {
    if (!selectedPartyId && parties.length) {
      setSelectedPartyId(parties[0].id);
    }
  }, [parties, selectedPartyId]);

  useEffect(() => {
    if (!selectableProofIds.length) {
      if (selectedProofId) setSelectedProofId('');
      return;
    }

    if (!selectedProofId || !selectableProofIds.includes(selectedProofId)) {
      setSelectedProofId(selectableProofIds[0]);
    }
  }, [selectableProofIds, selectedProofId]);

  const currentExam = useMemo(
    () => exams.find((exam) => exam.party_id === selectedPartyId && exam.exam_type === examType) || null,
    [exams, examType, selectedPartyId]
  );

  const currentExamItems = useMemo(
    () => examItems.filter((item) => item.exam_id === currentExam?.id),
    [currentExam, examItems]
  );

  const questionRows = useMemo(
    () => buildQuestionRows(currentExamItems, proofsById, selectedProofId),
    [currentExamItems, proofsById, selectedProofId]
  );

  const updateProofMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofs'], refetchType: 'active' }),
  });

  const juryPublished = juryState?.published_proof_id === selectedProof?.id && !juryState?.is_blank;
  const witnessPublished = witnessState?.published_proof_id === selectedProof?.id && !witnessState?.is_blank;

  const handlePublishJury = () => {
    if (!selectedProof || !canPublishToJury(selectedProof)) return;
    update({
      published_proof_id: selectedProof.id,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: false,
      exhibit_label: getPublishedLabel(selectedProof),
    });
  };

  const handleUnpublishJury = () => {
    if (!juryPublished) return;
    update({
      published_proof_id: null,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: true,
      exhibit_label: '',
    });
  };

  const handlePublishWitness = () => {
    if (!selectedProof || !canPublishToWitness(selectedProof)) return;
    updateWitness({
      published_proof_id: selectedProof.id,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: false,
      exhibit_label: getPublishedLabel(selectedProof),
    });
  };

  const handleUnpublishWitness = () => {
    if (!witnessPublished) return;
    updateWitness({
      published_proof_id: null,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: true,
      exhibit_label: '',
    });
  };

  return (
    <div className="h-full bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto flex h-full max-w-[1700px] flex-col gap-4">
        <AttorneyCentralActionBar
          proof={selectedProof}
          party={selectedParty}
          juryPublished={juryPublished}
          witnessPublished={witnessPublished}
          onPublishJury={handlePublishJury}
          onUnpublishJury={handleUnpublishJury}
          onPublishWitness={handlePublishWitness}
          onUnpublishWitness={handleUnpublishWitness}
          onAdmitExhibit={() => {
            setSelectedProofForModal(selectedProof);
            setShowAdmitExhibitModal(true);
          }}
          onAdmitDemo={() => {
            setSelectedProofForModal(selectedProof);
            setShowAdmitDemoModal(true);
          }}
          onUnadmit={() => {
            setSelectedProofForModal(selectedProof);
            setShowUnAdmitModal(true);
          }}
        />

        <div className="min-h-0 flex-1 overflow-hidden lg:hidden">
          <div className="flex h-full flex-col gap-4 overflow-auto">
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => setLeftOpen((value) => !value)} className="justify-center border-slate-300 bg-white text-slate-700">
                {leftOpen ? 'Hide Exhibits' : 'Show Exhibits'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setRightOpen((value) => !value)} className="justify-center border-slate-300 bg-white text-slate-700">
                {rightOpen ? 'Hide Questions' : 'Show Questions'}
              </Button>
            </div>

            {leftOpen ? (
              <div className="rounded-2xl border border-slate-200 shadow-sm">
                <AttorneyCentralProofPanel
                  collapsed={false}
                  onToggle={() => setLeftOpen(false)}
                  search={search}
                  onSearchChange={setSearch}
                  exhibitEntries={filteredExhibitEntries}
                  depositionEntries={filteredDepositionEntries}
                  partiesById={partiesById}
                  selectedProofId={selectedProofId}
                  onSelectProof={setSelectedProofId}
                />
              </div>
            ) : null}

            <div className="min-h-[32rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {selectedProof ? (
                <ProofPreviewPane
                  proof={selectedProof}
                  juryState={juryState}
                  witnessState={witnessState}
                  onUpdateJury={update}
                  onUpdateWitness={updateWitness}
                  onRuling={({ proofId, data }) => updateProofMutation.mutate({ proofId, data })}
                  onClose={() => setSelectedProofId('')}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-slate-500">Select a proof to preview it here.</div>
              )}
            </div>

            {rightOpen ? (
              <div className="rounded-2xl border border-slate-200 shadow-sm">
                <AttorneyCentralQuestionPanel
                  collapsed={false}
                  onToggle={() => setRightOpen(false)}
                  parties={parties}
                  selectedPartyId={selectedPartyId}
                  onPartyChange={setSelectedPartyId}
                  examType={examType}
                  onExamTypeChange={setExamType}
                  rows={questionRows}
                  proofsById={proofsById}
                  onSelectProof={setSelectedProofId}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:flex">
          <div className={`min-h-0 border-r border-slate-200 transition-all duration-300 ${leftOpen ? 'w-[360px]' : 'w-[72px]'}`}>
            <AttorneyCentralProofPanel
              collapsed={!leftOpen}
              onToggle={() => setLeftOpen((value) => !value)}
              search={search}
              onSearchChange={setSearch}
              exhibitEntries={filteredExhibitEntries}
              depositionEntries={filteredDepositionEntries}
              partiesById={partiesById}
              selectedProofId={selectedProofId}
              onSelectProof={setSelectedProofId}
            />
          </div>

          <div className="min-h-0 flex-1 bg-slate-100 p-4">
            <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {selectedProof ? (
                <ProofPreviewPane
                  proof={selectedProof}
                  juryState={juryState}
                  witnessState={witnessState}
                  onUpdateJury={update}
                  onUpdateWitness={updateWitness}
                  onRuling={({ proofId, data }) => updateProofMutation.mutate({ proofId, data })}
                  onClose={() => setSelectedProofId('')}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-slate-500">Select a proof to preview it here.</div>
              )}
            </div>
          </div>

          <div className={`min-h-0 border-l border-slate-200 transition-all duration-300 ${rightOpen ? 'w-[380px]' : 'w-[72px]'}`}>
            <AttorneyCentralQuestionPanel
              collapsed={!rightOpen}
              onToggle={() => setRightOpen((value) => !value)}
              parties={parties}
              selectedPartyId={selectedPartyId}
              onPartyChange={setSelectedPartyId}
              examType={examType}
              onExamTypeChange={setExamType}
              rows={questionRows}
              proofsById={proofsById}
              onSelectProof={setSelectedProofId}
            />
          </div>
        </div>
      </div>

      <AdmitAsExhibitModal
        open={showAdmitExhibitModal}
        onClose={() => {
          setShowAdmitExhibitModal(false);
          setSelectedProofForModal(null);
        }}
        proof={selectedProofForModal}
      />
      <AdmitAsDemonstrativeModal
        open={showAdmitDemoModal}
        onClose={() => {
          setShowAdmitDemoModal(false);
          setSelectedProofForModal(null);
        }}
        proof={selectedProofForModal}
      />
      <UnAdmitModal
        open={showUnAdmitModal}
        onClose={() => {
          setShowUnAdmitModal(false);
          setSelectedProofForModal(null);
        }}
        proof={selectedProofForModal}
      />
    </div>
  );
}