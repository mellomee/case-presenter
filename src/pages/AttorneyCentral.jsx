import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import AttorneyCentralStage from '@/components/attorneyCentral/AttorneyCentralStage.jsx';
import AttorneyCentralBottomBar from '@/components/attorneyCentral/AttorneyCentralBottomBar.jsx';
import AttorneyCentralLeftDrawer from '@/components/attorneyCentral/AttorneyCentralLeftDrawer.jsx';
import AttorneyCentralRightDrawer from '@/components/attorneyCentral/AttorneyCentralRightDrawer.jsx';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import { useWitnessSync } from '@/components/witnessView/useWitnessSync.jsx';
import { buildLinkedQuestionMap, buildProofFamilyLanes, canPublishToJury, canPublishToWitness, getPublishedLabel, getRootProofItems, getTopAncestorId } from '@/lib/attorneyCentralUtils';

export default function AttorneyCentral() {
  const queryClient = useQueryClient();
  const { juryState, update } = useJurySync('attorney');
  const { witnessState, update: updateWitness } = useWitnessSync('attorney');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedRootId, setSelectedRootId] = useState('');
  const [selectedProofId, setSelectedProofId] = useState('');
  const [libraryTab, setLibraryTab] = useState('exhibits');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [checkedQuestionIds, setCheckedQuestionIds] = useState([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showAdmitExhibitModal, setShowAdmitExhibitModal] = useState(false);
  const [showAdmitDemoModal, setShowAdmitDemoModal] = useState(false);
  const [showUnAdmitModal, setShowUnAdmitModal] = useState(false);

  const hubQueryOptions = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };
  const { data: parties = [] } = useQuery({ queryKey: ['acParties'], queryFn: () => base44.entities.Party.list(), ...hubQueryOptions });
  const { data: proofs = [] } = useQuery({ queryKey: ['acProofs'], queryFn: () => base44.entities.Proof.list(), ...hubQueryOptions });
  const { data: exams = [] } = useQuery({ queryKey: ['acExams'], queryFn: () => base44.entities.ExamV2.list(), ...hubQueryOptions });
  const { data: examItems = [] } = useQuery({ queryKey: ['acExamItems'], queryFn: () => base44.entities.ExamItemV2.list(), ...hubQueryOptions });
  const { data: legacyQuestions = [] } = useQuery({ queryKey: ['acLegacyQuestions'], queryFn: () => base44.entities.Question.list(), ...hubQueryOptions });

  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const currentExam = exams.find((exam) => exam.party_id === selectedPartyId && exam.exam_type === selectedExamType) || null;
  const currentExamItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootItems = useMemo(() => getRootProofItems(currentExamItems), [currentExamItems]);
  const selectedRootItem = rootItems.find((item) => item.id === selectedRootId) || null;
  const examQuestionItems = useMemo(() => currentExamItems.filter((item) => item.item_type === 'question'), [currentExamItems]);
  const questionRoots = useMemo(
    () => examQuestionItems.filter((item) => item.parent_item_id === selectedRootId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [examQuestionItems, selectedRootId]
  );
  const questionChildMap = useMemo(() => {
    return examQuestionItems.reduce((acc, item) => {
      if (!item.parent_item_id) return acc;
      acc[item.parent_item_id] = [...(acc[item.parent_item_id] || []), item].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return acc;
    }, {});
  }, [examQuestionItems]);
  const linkedQuestionMap = useMemo(() => buildLinkedQuestionMap(examQuestionItems, legacyQuestions), [examQuestionItems, legacyQuestions]);
  const selectedProof = selectedProofId ? proofsById[selectedProofId] || null : null;

  const exhibitParents = useMemo(() => {
    let items = proofs.filter((proof) => !proof.parent_proof_id && proof.proof_category === 'Exhibit' && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status));
    if (statusFilter !== 'all') {
      items = items.filter((proof) => proof.status.toLowerCase() === statusFilter);
    }
    const term = search.trim().toLowerCase();
    if (term) {
      items = items.filter((proof) => {
        const haystack = [proof.name, proof.formal_name, proof.joint_exhibit_num, proof.admitted_exhibit_num, proof.demonstrative_exhibit_num].join(' ').toLowerCase();
        return haystack.includes(term);
      });
    }
    return items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }, [proofs, search, statusFilter]);

  const depositionParents = useMemo(() => {
    let items = proofs.filter((proof) => !proof.parent_proof_id && proof.proof_category === 'Deposition');
    const term = search.trim().toLowerCase();
    if (term) {
      items = items.filter((proof) => [proof.name, proof.formal_name].join(' ').toLowerCase().includes(term));
    }
    return items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }, [proofs, search]);

  const lanes = useMemo(() => buildProofFamilyLanes(libraryTab === 'exhibits' ? exhibitParents : depositionParents, proofs), [libraryTab, exhibitParents, depositionParents, proofs]);

  const updateProofMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['acProofs'], refetchType: 'active' }),
  });

  useEffect(() => {
    if (!selectedPartyId && parties[0]) setSelectedPartyId(parties[0].id);
  }, [parties, selectedPartyId]);

  useEffect(() => {
    if (!rootItems.length) {
      setSelectedRootId('');
      return;
    }
    if (!rootItems.find((item) => item.id === selectedRootId)) {
      setSelectedRootId(rootItems[0].id);
    }
  }, [rootItems, selectedRootId]);

  useEffect(() => {
    if (selectedRootItem?.item_type === 'proof' && selectedRootItem.linked_proof_id) {
      setSelectedProofId(selectedRootItem.linked_proof_id);
    }
  }, [selectedRootItem]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => (isTimerRunning ? prev + 1 : prev));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTimerRunning]);

  const juryPublished = juryState?.published_proof_id === selectedProof?.id && !juryState?.is_blank;
  const witnessPublished = witnessState?.published_proof_id === selectedProof?.id && !witnessState?.is_blank;

  const publishToJury = () => {
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

  const unpublishFromJury = () => {
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

  const publishToWitness = () => {
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

  const unpublishFromWitness = () => {
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

  const toggleQuestionChecked = (questionId) => {
    setCheckedQuestionIds((prev) => prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <AttorneyCentralLeftDrawer
        open={leftOpen}
        onClose={() => setLeftOpen(false)}
        parties={parties}
        selectedPartyId={selectedPartyId}
        onPartyChange={setSelectedPartyId}
        selectedExamType={selectedExamType}
        onExamTypeChange={setSelectedExamType}
        rootItems={rootItems}
        selectedRootId={selectedRootId}
        onSelectRoot={setSelectedRootId}
        questionRoots={questionRoots}
        childMap={questionChildMap}
        proofsById={proofsById}
        checkedIds={checkedQuestionIds}
        onToggleChecked={toggleQuestionChecked}
        onSelectProof={setSelectedProofId}
      />

      <AttorneyCentralRightDrawer
        open={rightOpen}
        onClose={() => setRightOpen(false)}
        libraryTab={libraryTab}
        onLibraryTabChange={setLibraryTab}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
        lanes={lanes}
        selectedProofId={selectedProofId}
        onSelectProof={(proofId) => {
          setSelectedProofId(proofId);
          const rootAncestorId = getTopAncestorId(proofId, proofsById);
          const matchingRoot = rootItems.find((item) => item.linked_proof_id === rootAncestorId || item.linked_proof_id === proofId);
          if (matchingRoot) setSelectedRootId(matchingRoot.id);
        }}
        linkedQuestionMap={linkedQuestionMap}
      />

      <div className="relative flex h-full flex-col px-4 pb-28 pt-4 lg:px-6 lg:pt-6">
        <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex items-start justify-between lg:inset-x-6 lg:top-6">
          <div className="pointer-events-auto flex items-center gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-full bg-white/95 px-4 shadow-sm" onClick={() => setLeftOpen(true)}>
              <Menu className="h-4 w-4" />
              Exam
            </Button>
            {leftOpen && <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-full bg-white/95 shadow-sm" onClick={() => setLeftOpen(false)}><ChevronLeft className="h-4 w-4" /></Button>}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {rightOpen && <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-full bg-white/95 shadow-sm" onClick={() => setRightOpen(false)}><ChevronRight className="h-4 w-4" /></Button>}
            <Button type="button" variant="outline" className="h-11 rounded-full bg-white/95 px-4 shadow-sm" onClick={() => setRightOpen(true)}>
              Library
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 pt-16 lg:pt-20">
          <AttorneyCentralStage proof={selectedProof} allProofs={proofs} juryState={juryState} witnessState={witnessState} onUpdateJury={update} onUpdateWitness={updateWitness} />
        </div>
      </div>

      <AttorneyCentralBottomBar
        proof={selectedProof}
        elapsedSeconds={elapsedSeconds}
        isTimerRunning={isTimerRunning}
        onStartTimer={() => setIsTimerRunning(true)}
        onPauseTimer={() => setIsTimerRunning(false)}
        onResetTimer={() => { setIsTimerRunning(false); setElapsedSeconds(0); }}
        juryPublished={juryPublished}
        witnessPublished={witnessPublished}
        onPublishJury={publishToJury}
        onUnpublishJury={unpublishFromJury}
        onPublishWitness={publishToWitness}
        onUnpublishWitness={unpublishFromWitness}
        onAdmitExhibit={() => setShowAdmitExhibitModal(true)}
        onAdmitDemo={() => setShowAdmitDemoModal(true)}
        onUnadmit={() => setShowUnAdmitModal(true)}
      />

      <AdmitAsExhibitModal open={showAdmitExhibitModal} onClose={() => setShowAdmitExhibitModal(false)} proof={selectedProof} />
      <AdmitAsDemonstrativeModal open={showAdmitDemoModal} onClose={() => setShowAdmitDemoModal(false)} proof={selectedProof} />
      <UnAdmitModal open={showUnAdmitModal} onClose={() => setShowUnAdmitModal(false)} proof={selectedProof} />
    </div>
  );
}