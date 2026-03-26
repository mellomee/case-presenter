import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import { useJurySync } from '@/components/attorneyView/useJurySync';
import { useWitnessSync } from '@/components/witnessView/useWitnessSync';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal';
import AttorneyCentralProofBrowserDrawer from '@/components/attorneyCentral/AttorneyCentralProofBrowserDrawer.jsx';
import AttorneyCentralQuestionDrawer from '@/components/attorneyCentral/AttorneyCentralQuestionDrawer.jsx';
import AttorneyCentralStageInfo from '@/components/attorneyCentral/AttorneyCentralStageInfo.jsx';
import AttorneyCentralBottomDock from '@/components/attorneyCentral/AttorneyCentralBottomDock.jsx';
import { buildProofBrowserSections, canPublishProof, canPublishProofToWitness, getLinkedProofIds, getPublishedLabel } from '@/lib/attorneyCentralUtils';
import { parseIdsField } from '@/lib/examV2Utils';

const LOS_ANGELES_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Los_Angeles',
});

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

export default function AttorneyCentral() {
  const queryClient = useQueryClient();
  const { juryState, update } = useJurySync('attorney');
  const { witnessState, update: updateWitness } = useWitnessSync('attorney');
  const [selectedDrawer, setSelectedDrawer] = useState(null);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [selectedExamPartyId, setSelectedExamPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [selectedRootId, setSelectedRootId] = useState('');
  const [selectedProofId, setSelectedProofId] = useState('');
  const [selectedProofForModal, setSelectedProofForModal] = useState(null);
  const [showAdmitExhibitModal, setShowAdmitExhibitModal] = useState(false);
  const [showAdmitDemoModal, setShowAdmitDemoModal] = useState(false);
  const [showUnAdmitModal, setShowUnAdmitModal] = useState(false);
  const [localDecisionMap, setLocalDecisionMap] = useState({});
  const [checkedQuestions, setCheckedQuestions] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(window.localStorage.getItem('attorney-central-checked-questions') || '{}');
    } catch {
      return {};
    }
  });
  const [exhibitSearch, setExhibitSearch] = useState('');
  const [depositionSearch, setDepositionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingWitnessProof, setPendingWitnessProof] = useState(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTimeLabel, setCurrentTimeLabel] = useState(() => LOS_ANGELES_TIME_FORMATTER.format(new Date()));

  const queryOptions = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };
  const { data: parties = [] } = useQuery({ queryKey: ['attorneyCentralParties'], queryFn: () => base44.entities.Party.list(), ...queryOptions });
  const { data: proofs = [] } = useQuery({ queryKey: ['attorneyCentralProofs'], queryFn: () => base44.entities.Proof.list(), ...queryOptions });
  const { data: exams = [] } = useQuery({ queryKey: ['attorneyCentralExams'], queryFn: () => base44.entities.ExamV2.list(), ...queryOptions });
  const { data: examItems = [] } = useQuery({ queryKey: ['attorneyCentralExamItems'], queryFn: () => base44.entities.ExamItemV2.list(), ...queryOptions });

  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const currentExam = exams.find((exam) => exam.party_id === selectedExamPartyId && exam.exam_type === selectedExamType) || null;
  const currentExamItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootItems = useMemo(
    () => currentExamItems.filter((item) => !item.parent_item_id && item.item_type !== 'question').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [currentExamItems]
  );
  const questionChildrenMap = useMemo(
    () => currentExamItems.filter((item) => item.item_type === 'question').reduce((acc, item) => {
      const key = item.parent_item_id || 'root';
      acc[key] = acc[key] || [];
      acc[key].push(item);
      acc[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return acc;
    }, {}),
    [currentExamItems]
  );
  const questionRoots = questionChildrenMap[selectedRootId] || [];
  const rootOrderMap = useMemo(() => Object.fromEntries(rootItems.map((item, index) => [item.id, index + 1])), [rootItems]);

  const updateProofMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attorneyCentralProofs'], refetchType: 'active' }),
  });

  useEffect(() => {
    if (!selectedExamPartyId && parties[0]) setSelectedExamPartyId(parties[0].id);
  }, [parties, selectedExamPartyId]);

  useEffect(() => {
    if (!rootItems.length) {
      setSelectedRootId('');
      return;
    }
    if (!rootItems.some((item) => item.id === selectedRootId)) setSelectedRootId(rootItems[0].id);
  }, [rootItems, selectedRootId]);

  const allMarkedExhibits = useMemo(
    () => proofs.filter((proof) => proof.proof_category === 'Exhibit' && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)),
    [proofs]
  );

  const filteredMarkedExhibits = useMemo(() => {
    const term = normalizeSearchValue(exhibitSearch);
    return allMarkedExhibits.filter((proof) => {
      if (statusFilter !== 'all' && proof.status.toLowerCase() !== statusFilter) return false;
      if (!term) return true;
      const haystack = [proof.name, proof.formal_name, proof.joint_exhibit_num, proof.admitted_exhibit_num, proof.demonstrative_exhibit_num].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [allMarkedExhibits, exhibitSearch, statusFilter]);

  const filteredDepositions = useMemo(() => {
    const term = normalizeSearchValue(depositionSearch);
    return proofs.filter((proof) => proof.proof_category === 'Deposition').filter((proof) => {
      if (!term) return true;
      return [proof.name, proof.formal_name].join(' ').toLowerCase().includes(term);
    });
  }, [proofs, depositionSearch]);

  const exhibitSections = useMemo(() => buildProofBrowserSections(filteredMarkedExhibits), [filteredMarkedExhibits]);
  const depositionSections = useMemo(() => buildProofBrowserSections(filteredDepositions), [filteredDepositions]);

  useEffect(() => {
    if (selectedProofId && proofsById[selectedProofId]) return;
    const preferredRootItem = rootItems.find((item) => item.id === selectedRootId && item.item_type === 'proof' && item.linked_proof_id);
    const nextProofId = preferredRootItem?.linked_proof_id || exhibitSections[0]?.root?.id || depositionSections[0]?.root?.id || '';
    setSelectedProofId(nextProofId);
  }, [selectedProofId, proofsById, rootItems, selectedRootId, exhibitSections, depositionSections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('attorney-central-checked-questions', JSON.stringify(checkedQuestions));
  }, [checkedQuestions]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTimeLabel(LOS_ANGELES_TIME_FORMATTER.format(new Date()));
      setElapsedSeconds((previous) => (isTimerRunning ? previous + 1 : previous));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    const unsubscribe = base44.entities.Proof.subscribe((event) => {
      if (event.type !== 'create') return;
      if (!event.data?.witness_name || !event.data?.witness_markup || event.data?.status !== 'Draft') return;
      setPendingWitnessProof(event.data);
      queryClient.invalidateQueries({ queryKey: ['attorneyCentralProofs'], refetchType: 'active' });
    });
    return unsubscribe;
  }, [queryClient]);

  const selectedProof = proofsById[selectedProofId] || null;
  const selectedLocalDecision = selectedProof?.status === 'Joint' ? localDecisionMap[selectedProof?.id] : null;
  const selectedProofIsPublished = juryState?.published_proof_id === selectedProof?.id && !juryState?.is_blank;
  const selectedProofIsPublishedToWitness = witnessState?.published_proof_id === selectedProof?.id && !witnessState?.is_blank;
  const selectedProofCanPublish = canPublishProof(selectedProof, selectedLocalDecision);
  const selectedProofCanPublishToWitness = canPublishProofToWitness(selectedProof);
  const linkedQuestionCount = useMemo(
    () => currentExamItems.filter((item) => item.item_type === 'question').filter((item) => getLinkedProofIds(item).includes(selectedProof?.id)).length,
    [currentExamItems, selectedProof?.id]
  );

  const handleSelectProof = (proofId, closeQuestions = false) => {
    setSelectedProofId(proofId);
    setSelectedDrawer(null);
    if (closeQuestions) setQuestionsOpen(false);
  };

  const handleToggleQuestion = (questionId) => {
    setCheckedQuestions((previous) => ({ ...previous, [questionId]: !previous[questionId] }));
  };

  const handleAddWitnessProof = () => {
    if (!pendingWitnessProof) return;
    const parentProof = proofsById[pendingWitnessProof.parent_proof_id];
    updateProofMutation.mutate({
      proofId: pendingWitnessProof.id,
      data: {
        status: 'Joint',
        joint_exhibit_num: parentProof?.joint_exhibit_num || parentProof?.admitted_exhibit_num || parentProof?.demonstrative_exhibit_num || null,
        joint_by: parentProof?.joint_by || parentProof?.admitted_by || null,
        joint_date: parentProof?.joint_date || parentProof?.admit_date || null,
      },
    });
    setSelectedProofId(pendingWitnessProof.id);
    setSelectedDrawer('exhibits');
    setPendingWitnessProof(null);
  };

  const publishProof = () => {
    if (!selectedProof || !selectedProofCanPublish) return;
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

  const unpublishProof = () => {
    if (!selectedProof || !selectedProofIsPublished) return;
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

  const publishProofToWitness = () => {
    if (!selectedProof || !selectedProofCanPublishToWitness) return;
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

  const unpublishProofFromWitness = () => {
    if (!selectedProof || !selectedProofIsPublishedToWitness) return;
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

  const handleOpenAdmitExhibit = () => {
    if (!selectedProof) return;
    setSelectedProofForModal(selectedProof);
    setShowAdmitExhibitModal(true);
  };

  const handleOpenAdmitDemo = () => {
    if (!selectedProof) return;
    setSelectedProofForModal(selectedProof);
    setShowAdmitDemoModal(true);
  };

  const handleOpenUnAdmit = () => {
    if (!selectedProof) return;
    setSelectedProofForModal(selectedProof);
    setShowUnAdmitModal(true);
  };

  const handleToggleReject = () => {
    if (!selectedProof) return;
    setLocalDecisionMap((previous) => ({ ...previous, [selectedProof.id]: previous[selectedProof.id] === 'not_admitted' ? null : 'not_admitted' }));
  };

  return (
    <div className="relative h-screen overflow-hidden bg-slate-200" style={{ background: 'radial-gradient(circle at top, #f7eadb 0%, #eef2f7 52%, #e2e8f0 100%)' }}>
      <div className="absolute inset-0 pb-28">
        <div className="h-full p-3 md:p-4">
          {selectedProof ? (
            <div className="h-full overflow-hidden rounded-[32px] border border-white/30 bg-white/55 shadow-2xl backdrop-blur-sm">
              <ProofPreviewPane
                proof={selectedProof}
                juryState={juryState}
                witnessState={witnessState}
                onUpdateJury={update}
                onUpdateWitness={updateWitness}
                onRuling={({ proofId, data }) => updateProofMutation.mutate({ proofId, data })}
                onClose={() => setSelectedProofId('')}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/60 text-center shadow-xl backdrop-blur-sm">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Attorney Central</div>
                <div className="mt-3 text-3xl font-black text-slate-900">Open a marked exhibit, deposition, or linked proof</div>
                <div className="mt-2 text-sm text-slate-600">Use the side drawers to choose the next proof.</div>
              </div>
            </div>
          )}
        </div>

        <AttorneyCentralStageInfo proof={selectedProof} proofsById={proofsById} localDecision={selectedLocalDecision} linkedQuestionCount={linkedQuestionCount} />

        <div className="absolute inset-y-0 left-0 z-20 flex items-center pl-3">
          <div className="space-y-2">
            <button type="button" onClick={() => setSelectedDrawer((value) => value === 'exhibits' ? null : 'exhibits')} className="min-h-[48px] rounded-r-2xl border border-white/25 bg-slate-950/75 px-4 text-sm font-semibold text-white shadow-xl backdrop-blur-xl">Marked</button>
            <button type="button" onClick={() => setSelectedDrawer((value) => value === 'depositions' ? null : 'depositions')} className="min-h-[48px] rounded-r-2xl border border-white/25 bg-slate-950/75 px-4 text-sm font-semibold text-white shadow-xl backdrop-blur-xl">Depos</button>
          </div>
        </div>

        <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-3">
          <button type="button" onClick={() => setQuestionsOpen((value) => !value)} className="min-h-[48px] rounded-l-2xl border border-white/25 bg-slate-950/75 px-4 text-sm font-semibold text-white shadow-xl backdrop-blur-xl">Questions</button>
        </div>

        <AttorneyCentralProofBrowserDrawer
          open={selectedDrawer === 'exhibits'}
          title="Marked Exhibits"
          sections={exhibitSections}
          searchValue={exhibitSearch}
          onSearchChange={setExhibitSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          selectedProofId={selectedProofId}
          onSelectProof={(proofId) => handleSelectProof(proofId)}
          onClose={() => setSelectedDrawer(null)}
        />

        <AttorneyCentralProofBrowserDrawer
          open={selectedDrawer === 'depositions'}
          title="Depositions"
          sections={depositionSections}
          searchValue={depositionSearch}
          onSearchChange={setDepositionSearch}
          statusFilter={null}
          onStatusFilterChange={null}
          selectedProofId={selectedProofId}
          onSelectProof={(proofId) => handleSelectProof(proofId)}
          onClose={() => setSelectedDrawer(null)}
        />

        <AttorneyCentralQuestionDrawer
          open={questionsOpen}
          parties={parties}
          selectedExamPartyId={selectedExamPartyId}
          onChangeParty={setSelectedExamPartyId}
          selectedExamType={selectedExamType}
          onChangeExamType={setSelectedExamType}
          rootItems={rootItems}
          selectedRootId={selectedRootId}
          onSelectRoot={setSelectedRootId}
          questionRoots={questionRoots}
          questionChildrenMap={questionChildrenMap}
          proofsById={proofsById}
          checkedQuestions={checkedQuestions}
          onToggleQuestion={handleToggleQuestion}
          onSelectProof={(proofId) => handleSelectProof(proofId, true)}
          rootOrderMap={rootOrderMap}
          onClose={() => setQuestionsOpen(false)}
        />

        {pendingWitnessProof ? (
          <div className="absolute bottom-28 left-1/2 z-20 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[24px] border border-amber-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">New witness proof</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">A new witness-created proof is ready to add to Marked Exhibits.</div>
              </div>
              <button type="button" onClick={handleAddWitnessProof} className="min-h-[44px] rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add to Marked Exhibits</button>
            </div>
          </div>
        ) : null}
      </div>

      <AttorneyCentralBottomDock
        selectedProof={selectedProof}
        elapsedSeconds={elapsedSeconds}
        isTimerRunning={isTimerRunning}
        onStartTimer={() => setIsTimerRunning(true)}
        onPauseTimer={() => setIsTimerRunning(false)}
        onResetTimer={() => { setIsTimerRunning(false); setElapsedSeconds(0); }}
        canPublish={selectedProofCanPublish}
        isPublished={selectedProofIsPublished}
        onPublish={publishProof}
        onUnpublish={unpublishProof}
        canPublishToWitness={selectedProofCanPublishToWitness}
        isPublishedToWitness={selectedProofIsPublishedToWitness}
        onPublishToWitness={publishProofToWitness}
        onUnpublishToWitness={unpublishProofFromWitness}
        onAdmitExhibit={handleOpenAdmitExhibit}
        onAdmitDemo={handleOpenAdmitDemo}
        onUnAdmit={handleOpenUnAdmit}
        onToggleReject={handleToggleReject}
        rejectActive={selectedLocalDecision === 'not_admitted'}
      />

      <AdmitAsExhibitModal
        open={showAdmitExhibitModal}
        onClose={() => {
          if (selectedProofForModal?.id) setLocalDecisionMap((previous) => ({ ...previous, [selectedProofForModal.id]: null }));
          setShowAdmitExhibitModal(false);
          setSelectedProofForModal(null);
        }}
        proof={selectedProofForModal}
      />
      <AdmitAsDemonstrativeModal
        open={showAdmitDemoModal}
        onClose={() => {
          if (selectedProofForModal?.id) setLocalDecisionMap((previous) => ({ ...previous, [selectedProofForModal.id]: null }));
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