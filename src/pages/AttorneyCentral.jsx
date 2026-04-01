import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, FolderKanban, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import { useWitnessSync } from '@/components/witnessView/useWitnessSync.jsx';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal';
import AttorneyCentralPreview from '@/components/attorneyCentral/AttorneyCentralPreview.jsx';
import AttorneyCentralMarkedDrawer from '@/components/attorneyCentral/AttorneyCentralMarkedDrawer.jsx';
import AttorneyCentralQuestionsDrawer from '@/components/attorneyCentral/AttorneyCentralQuestionsDrawer.jsx';
import AttorneyCentralBottomBar from '@/components/attorneyCentral/AttorneyCentralBottomBar.jsx';
import AttorneyCentralWitnessNotice from '@/components/attorneyCentral/AttorneyCentralWitnessNotice.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { buildChildrenMap, canPublishProof, canPublishProofToWitness, getPublishedLabel } from '@/lib/attorneyCentralUtils';

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Los_Angeles',
});

const ATTORNEY_CENTRAL_QUESTIONS_STATE_KEY = 'attorney-central-questions-state';

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function AttorneyCentral() {
  const queryClient = useQueryClient();
  const { juryState, update } = useJurySync('attorney');
  const { witnessState, update: updateWitness } = useWitnessSync('attorney');
  const [leftDrawer, setLeftDrawer] = useState(null);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [markedSearch, setMarkedSearch] = useState('');
  const [depositionSearch, setDepositionSearch] = useState('');
  const [selectedDepositionPartyId, setSelectedDepositionPartyId] = useState('all');
  const [selectedDepositionParentId, setSelectedDepositionParentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProofId, setSelectedProofId] = useState('');
  const savedQuestionsState = React.useMemo(() => {
    try {
      return JSON.parse(window.localStorage.getItem(ATTORNEY_CENTRAL_QUESTIONS_STATE_KEY) || '{}');
    } catch {
      return {};
    }
  }, []);
  const [selectedExamType, setSelectedExamType] = useState(savedQuestionsState.selectedExamType || 'Direct');
  const [selectedExamPartyId, setSelectedExamPartyId] = useState(savedQuestionsState.selectedExamPartyId || '');
  const [selectedRootId, setSelectedRootId] = useState(savedQuestionsState.selectedRootId || '');
  const [checkedQuestionIds, setCheckedQuestionIds] = useState([]);
  const [localDecisionMap, setLocalDecisionMap] = useState({});
  const [selectedProofForModal, setSelectedProofForModal] = useState(null);
  const [showAdmitExhibitModal, setShowAdmitExhibitModal] = useState(false);
  const [showAdmitDemoModal, setShowAdmitDemoModal] = useState(false);
  const [showUnAdmitModal, setShowUnAdmitModal] = useState(false);
  const [pendingWitnessProof, setPendingWitnessProof] = useState(null);
  const [highlightedProofId, setHighlightedProofId] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTimeLabel, setCurrentTimeLabel] = useState(() => TIME_FORMATTER.format(new Date()));
  const [attorneyTouchMode, setAttorneyTouchMode] = useState('navigate');
  const [attorneyMarkupTool, setAttorneyMarkupTool] = useState('pen');
  const [attorneyMarkupByProof, setAttorneyMarkupByProof] = useState({});

  const hubQueryOptions = {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  };

  const { data: parties = [] } = useQuery({ queryKey: ['attorneyCentralParties'], queryFn: () => base44.entities.Party.list(), ...hubQueryOptions });
  const { data: proofs = [] } = useQuery({ queryKey: ['proofs'], queryFn: () => base44.entities.Proof.list(), ...hubQueryOptions });
  const { data: exams = [] } = useQuery({ queryKey: ['attorneyCentralExams'], queryFn: () => base44.entities.ExamV2.list(), ...hubQueryOptions });
  const { data: examItems = [] } = useQuery({ queryKey: ['attorneyCentralExamItems'], queryFn: () => base44.entities.ExamItemV2.list(), ...hubQueryOptions });

  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const childrenMap = useMemo(() => buildChildrenMap(proofs), [proofs]);
  const markedExhibits = useMemo(
    () => proofs.filter((proof) => {
      if (proof.proof_category !== 'Exhibit' || !['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)) return false;
      const parentProof = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
      return !parentProof || parentProof.proof_category !== 'Exhibit' || !['Joint', 'Admitted', 'Demonstrative'].includes(parentProof.status);
    }),
    [proofs, proofsById]
  );
  const depositions = useMemo(
    () => proofs.filter((proof) => proof.proof_category === 'Deposition' && !proof.parent_proof_id),
    [proofs]
  );

  const currentExam = exams.find((exam) => exam.party_id === selectedExamPartyId && exam.exam_type === selectedExamType) || null;
  const currentExamItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootItems = useMemo(
    () => currentExamItems.filter((item) => !item.parent_item_id && item.item_type !== 'question').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [currentExamItems]
  );
  const questionItems = useMemo(() => currentExamItems.filter((item) => item.item_type === 'question'), [currentExamItems]);
  const selectedProof = selectedProofId ? proofsById[selectedProofId] || null : null;
  const localDecision = selectedProof?.status === 'Joint' ? localDecisionMap[selectedProof.id] : null;
  const isPublishedToJury = juryState?.published_proof_id === selectedProof?.id && !juryState?.is_blank;
  const isPublishedToWitness = witnessState?.published_proof_id === selectedProof?.id && !witnessState?.is_blank;
  const canPublishToJury = canPublishProof(selectedProof, localDecision);
  const canPublishToWitness = canPublishProofToWitness(selectedProof);

  useEffect(() => {
    if (selectedProof?.proof_category !== 'Deposition') return;
    setSelectedDepositionParentId(selectedProof.parent_proof_id || selectedProof.id);
  }, [selectedProof]);

  const updateProofMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onMutate: async ({ proofId, data }) => {
      const previousProofs = queryClient.getQueryData(['proofs']);
      queryClient.setQueryData(['proofs'], (current = []) => current.map((proof) => (
        proof.id === proofId ? { ...proof, ...data } : proof
      )));
      return { previousProofs };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProofs) queryClient.setQueryData(['proofs'], context.previousProofs);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofs'], refetchType: 'active' }),
  });

  useEffect(() => {
    if (!selectedExamPartyId && parties[0]) setSelectedExamPartyId(parties[0].id);
  }, [parties, selectedExamPartyId]);

  useEffect(() => {
    if (!selectedProofId && markedExhibits[0]) setSelectedProofId(markedExhibits[0].id);
  }, [markedExhibits, selectedProofId]);

  useEffect(() => {
    if (!selectedRootId && rootItems[0]) setSelectedRootId(rootItems[0].id);
    if (selectedRootId && !rootItems.some((item) => item.id === selectedRootId)) setSelectedRootId(rootItems[0]?.id || '');
  }, [rootItems, selectedRootId]);

  useEffect(() => {
    window.localStorage.setItem(
      ATTORNEY_CENTRAL_QUESTIONS_STATE_KEY,
      JSON.stringify({ selectedExamType, selectedExamPartyId, selectedRootId })
    );
  }, [selectedExamType, selectedExamPartyId, selectedRootId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTimeLabel(TIME_FORMATTER.format(new Date()));
      setElapsedSeconds((prev) => (isTimerRunning ? prev + 1 : prev));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    const unsubscribe = base44.entities.Proof.subscribe((event) => {
      if (event.type !== 'create') return;
      if (!event.data?.witness_name || !event.data?.witness_markup || event.data?.status !== 'Draft') return;
      setPendingWitnessProof(event.data);
      queryClient.invalidateQueries({ queryKey: ['proofs'], refetchType: 'active' });
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (!highlightedProofId) return;
    const timeoutId = window.setTimeout(() => setHighlightedProofId(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedProofId]);

  const selectProof = (proofId, source = null, options = {}) => {
    setSelectedProofId(proofId);

    if (source === 'depositions') {
      const nextProof = proofsById[proofId];
      setSelectedDepositionParentId(nextProof?.parent_proof_id || proofId);
    }

    if ((source === 'marked' || source === 'depositions') && !options.keepDrawerOpen) setLeftDrawer(null);
  };

  const handleProofAction = (proof, action) => {
    if (action === 'not_admitted') {
      setLocalDecisionMap((prev) => ({ ...prev, [proof.id]: prev[proof.id] === 'not_admitted' ? null : 'not_admitted' }));
      return;
    }
    if (action === 'admit') {
      setSelectedProofForModal(proof);
      setShowAdmitExhibitModal(true);
      return;
    }
    if (action === 'demo') {
      setSelectedProofForModal(proof);
      setShowAdmitDemoModal(true);
      return;
    }
    if (action === 'unadmit') {
      setSelectedProofForModal(proof);
      setShowUnAdmitModal(true);
    }
  };

  const publishProof = (proof) => {
    if (!canPublishProof(proof, proof?.status === 'Joint' ? localDecisionMap[proof?.id] : null)) return;
    update({
      published_proof_id: proof.id,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: false,
      exhibit_label: getPublishedLabel(proof),
      attorney_markup: attorneyMarkupByProof[proof.id] || { strokes: [], highlights: [] },
    });
  };

  useEffect(() => {
    if (!selectedProof?.id) return;
    if (juryState?.published_proof_id === selectedProof.id) {
      update({ attorney_markup: attorneyMarkupByProof[selectedProof.id] || { strokes: [], highlights: [] } });
    }
    if (witnessState?.published_proof_id === selectedProof.id) {
      updateWitness({ attorney_markup: attorneyMarkupByProof[selectedProof.id] || { strokes: [], highlights: [] } });
    }
  }, [selectedProof?.id, attorneyMarkupByProof, juryState?.published_proof_id, witnessState?.published_proof_id, update, updateWitness]);

  const unpublishProof = (proof) => {
    if (juryState?.published_proof_id !== proof?.id || juryState?.is_blank) return;
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

  const publishProofToWitness = (proof) => {
    if (!canPublishProofToWitness(proof)) return;
    updateWitness({
      published_proof_id: proof.id,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: false,
      exhibit_label: getPublishedLabel(proof),
      attorney_markup: attorneyMarkupByProof[proof.id] || { strokes: [], highlights: [] },
    });
  };

  const unpublishProofFromWitness = (proof) => {
    if (witnessState?.published_proof_id !== proof?.id || witnessState?.is_blank) return;
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

  const handleAddWitnessProof = () => {
    if (!pendingWitnessProof) return;
    const parentProof = proofsById[pendingWitnessProof.parent_proof_id];
    const inheritedStatus = parentProof?.status || 'Draft';
    const updateData = {
      status: inheritedStatus,
      joint_exhibit_num: parentProof?.joint_exhibit_num || null,
      joint_by: parentProof?.joint_by || null,
      joint_date: parentProof?.joint_date || null,
      admitted_exhibit_num: parentProof?.admitted_exhibit_num || null,
      admitted_by: parentProof?.admitted_by || null,
      admit_date: parentProof?.admit_date || null,
      demonstrative_exhibit_num: parentProof?.demonstrative_exhibit_num || null,
    };

    updateProofMutation.mutate({
      proofId: pendingWitnessProof.id,
      data: updateData,
    });
    setPendingWitnessProof(null);
    setLeftDrawer('marked');
    setStatusFilter(
      inheritedStatus === 'Admitted'
        ? 'admitted'
        : inheritedStatus === 'Demonstrative'
          ? 'demonstrative'
          : inheritedStatus === 'Joint'
            ? 'joint'
            : 'all'
    );
    setSelectedProofId(pendingWitnessProof.id);
    setHighlightedProofId(pendingWitnessProof.id);
  };

  return (
    <div className="h-full bg-[#f3ebdf]">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
          <AttorneyCentralPreview
            proof={selectedProof}
            allProofs={proofs}
            juryState={juryState}
            witnessState={witnessState}
            onUpdateJury={update}
            onUpdateWitness={updateWitness}
            touchMode={attorneyTouchMode}
            markupTool={attorneyMarkupTool}
            onTouchModeChange={setAttorneyTouchMode}
            onMarkupToolChange={setAttorneyMarkupTool}
            markupState={selectedProof ? (attorneyMarkupByProof[selectedProof.id] || { strokes: [], highlights: [] }) : { strokes: [], highlights: [] }}
            onMarkupStateChange={(nextState) => {
              if (!selectedProof?.id) return;
              setAttorneyMarkupByProof((current) => ({ ...current, [selectedProof.id]: nextState }));
            }}
          />
        </div>

        {(leftDrawer || rightDrawerOpen) ? (
          <button
            type="button"
            aria-label="Close open panels"
            onClick={() => {
              setLeftDrawer(null);
              setRightDrawerOpen(false);
            }}
            className="absolute inset-0 z-10 cursor-default"
          />
        ) : null}

        <div className="pointer-events-none absolute bottom-4 top-3 z-30 flex flex-col justify-center gap-3 transition-all duration-300" style={{ left: leftDrawer ? 'min(28rem, calc(100vw - 3rem))' : '0.75rem', transform: leftDrawer ? 'translateX(0.75rem)' : 'none' }}>
          <button type="button" onClick={() => setLeftDrawer((value) => value === 'marked' ? null : 'marked')} className={`pointer-events-auto rounded-3xl border p-3 shadow-lg transition ${leftDrawer === 'marked' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700'}`} title="Marked Exhibits">
            <FileText className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setLeftDrawer((value) => value === 'depositions' ? null : 'depositions')} className={`pointer-events-auto rounded-3xl border p-3 shadow-lg transition ${leftDrawer === 'depositions' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700'}`} title="Depositions">
            <Play className="h-5 w-5" />
          </button>
        </div>

        <AttorneyCentralMarkedDrawer
          title={leftDrawer === 'depositions' ? 'Depositions' : 'Marked Exhibits'}
          open={Boolean(leftDrawer)}
          onClose={() => setLeftDrawer(null)}
          mode={leftDrawer === 'depositions' ? 'depositions' : 'marked'}
          proofs={leftDrawer === 'depositions' ? depositions : markedExhibits}
          childrenMap={childrenMap}
          selectedProofId={selectedProofId}
          onSelectProof={(proofId, options) => selectProof(proofId, leftDrawer === 'depositions' ? 'depositions' : 'marked', options)}
          highlightedProofId={highlightedProofId}
          examItems={currentExamItems}
          localDecisionMap={localDecisionMap}
          search={leftDrawer === 'depositions' ? depositionSearch : markedSearch}
          onSearchChange={leftDrawer === 'depositions' ? setDepositionSearch : setMarkedSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          parties={parties}
          selectedDepositionPartyId={selectedDepositionPartyId}
          onSelectDepositionPartyId={setSelectedDepositionPartyId}
          selectedDepositionParentId={selectedDepositionParentId}
          onSelectDepositionParentId={setSelectedDepositionParentId}
        />

        <div className="pointer-events-none absolute bottom-4 right-3 top-3 z-30 flex flex-col justify-center gap-3">
          <button type="button" onClick={() => setRightDrawerOpen((value) => !value)} className={`pointer-events-auto rounded-3xl border p-3 shadow-lg transition ${rightDrawerOpen ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700'}`} title="Questions">
            <FolderKanban className="h-5 w-5" />
          </button>
        </div>

        <AttorneyCentralQuestionsDrawer
          open={rightDrawerOpen}
          onClose={() => setRightDrawerOpen(false)}
          parties={parties}
          selectedExamPartyId={selectedExamPartyId}
          onSelectExamPartyId={setSelectedExamPartyId}
          selectedExamType={selectedExamType}
          onSelectExamType={setSelectedExamType}
          rootItems={rootItems}
          selectedRootId={selectedRootId}
          onSelectRootId={setSelectedRootId}
          questionItems={questionItems}
          proofsById={proofsById}
          selectedProofId={selectedProofId}
          localDecisionMap={localDecisionMap}
          checkedQuestionIds={checkedQuestionIds}
          onToggleChecked={(questionId) => setCheckedQuestionIds((prev) => prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId])}
          onSelectProof={(proofId) => selectProof(proofId, 'questions')}
        />

        <AttorneyCentralWitnessNotice proof={pendingWitnessProof} onAdd={handleAddWitnessProof} onDismiss={() => setPendingWitnessProof(null)} />
        </div>

        <div className="shrink-0 z-30">
          <AttorneyCentralBottomBar
            selectedProof={selectedProof}
            localDecision={localDecision}
            isTimerRunning={isTimerRunning}
            elapsedLabel={formatElapsedTime(elapsedSeconds)}
            currentTimeLabel={currentTimeLabel}
            onStartTimer={() => setIsTimerRunning(true)}
            onPauseTimer={() => setIsTimerRunning(false)}
            onResetTimer={() => {
              setIsTimerRunning(false);
              setElapsedSeconds(0);
            }}
            canPublishToJury={canPublishToJury}
            isPublishedToJury={isPublishedToJury}
            onPublishToJury={() => publishProof(selectedProof)}
            onUnpublishFromJury={() => unpublishProof(selectedProof)}
            canPublishToWitness={canPublishToWitness}
            isPublishedToWitness={isPublishedToWitness}
            onPublishToWitness={() => publishProofToWitness(selectedProof)}
            onUnpublishFromWitness={() => unpublishProofFromWitness(selectedProof)}
            onRejectToggle={() => handleProofAction(selectedProof, 'not_admitted')}
            onAdmitExhibit={() => handleProofAction(selectedProof, 'admit')}
            onAdmitDemo={() => handleProofAction(selectedProof, 'demo')}
            onUnAdmit={() => handleProofAction(selectedProof, 'unadmit')}
          />
        </div>

        <AdmitAsExhibitModal
          open={showAdmitExhibitModal}
          onClose={() => {
            if (selectedProofForModal?.id) setLocalDecisionMap((prev) => ({ ...prev, [selectedProofForModal.id]: null }));
            setShowAdmitExhibitModal(false);
            setSelectedProofForModal(null);
          }}
          proof={selectedProofForModal}
        />
        <AdmitAsDemonstrativeModal
          open={showAdmitDemoModal}
          onClose={() => {
            if (selectedProofForModal?.id) setLocalDecisionMap((prev) => ({ ...prev, [selectedProofForModal.id]: null }));
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
    </div>
  );
}