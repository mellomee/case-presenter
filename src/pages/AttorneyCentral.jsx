import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync';
import { useWitnessSync } from '@/components/witnessView/useWitnessSync';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal.jsx';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal.jsx';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal.jsx';
import ActionStrip from '@/components/attorneyCentral/ActionStrip.jsx';
import MobileDock from '@/components/attorneyCentral/MobileDock.jsx';
import PreviewCanvas from '@/components/attorneyCentral/PreviewCanvas.jsx';
import ProofPanel from '@/components/attorneyCentral/ProofPanel.jsx';
import QuestionPanel from '@/components/attorneyCentral/QuestionPanel.jsx';
import {
  buildProofCollections,
  isQuestionLinkedToProof,
  resolveSelectableProofId,
} from '@/components/attorneyCentral/attorneyCentralUtils';

const RESET_PRESENT_STATE = {
  is_blank: true,
  published_proof_id: null,
  pdf_page: 1,
  zoom: 1,
  panX: 0,
  panY: 0,
  video_time: 0,
  is_playing: false,
  exhibit_label: '',
};

function getPublishLabel(proof) {
  return proof?.admitted_exhibit_num
    || proof?.demonstrative_exhibit_num
    || proof?.joint_exhibit_num
    || proof?.formal_name
    || proof?.name
    || '';
}

export default function AttorneyCentral() {
  const queryClient = useQueryClient();
  const [selectedProofId, setSelectedProofId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [exhibitsOpen, setExhibitsOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [admitTarget, setAdmitTarget] = useState(null);
  const [demoTarget, setDemoTarget] = useState(null);
  const [unAdmitTarget, setUnAdmitTarget] = useState(null);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
    initialData: [],
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list(),
    initialData: [],
  });

  const { juryState, update: updateJury } = useJurySync('attorney');
  const { witnessState, update: updateWitness } = useWitnessSync('attorney');

  useEffect(() => {
    const unsubProofs = base44.entities.Proof.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
    });
    const unsubQuestions = base44.entities.Question.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    });

    return () => {
      unsubProofs();
      unsubQuestions();
    };
  }, [queryClient]);

  const { proofById, childrenByParent, hiddenRootIds, exhibitRoots, depositionRoots } = useMemo(
    () => buildProofCollections(proofs),
    [proofs]
  );

  const allVisibleRootIds = [...exhibitRoots, ...depositionRoots].map((proof) => proof.id);

  useEffect(() => {
    if (!selectedProofId) {
      setSelectedProofId(allVisibleRootIds[0] || null);
      return;
    }

    if (!proofById[selectedProofId]) {
      setSelectedProofId(allVisibleRootIds[0] || null);
    }
  }, [selectedProofId, proofById, allVisibleRootIds]);

  const selectedProof = selectedProofId ? proofById[selectedProofId] : null;

  const linkedQuestions = useMemo(() => {
    if (!selectedProof) return [];
    return questions.filter((question) => isQuestionLinkedToProof(question, selectedProof, proofById));
  }, [questions, selectedProof, proofById]);

  const questionCountByProofId = useMemo(() => {
    return Object.fromEntries(
      proofs.map((proof) => [
        proof.id,
        questions.filter((question) => isQuestionLinkedToProof(question, proof, proofById)).length,
      ])
    );
  }, [proofs, questions, proofById]);

  const resolveProofSelection = (proofId) => {
    const nextId = resolveSelectableProofId(proofId, proofById, childrenByParent, hiddenRootIds);
    setSelectedProofId(nextId);
    setQuestionsOpen(false);
    setExhibitsOpen(false);
  };

  const publishToJury = () => {
    if (!selectedProof) return;
    const canPublish = selectedProof.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(selectedProof.status);
    if (!canPublish) return;

    updateJury({
      ...RESET_PRESENT_STATE,
      is_blank: false,
      published_proof_id: selectedProof.id,
      exhibit_label: getPublishLabel(selectedProof),
    });
  };

  const publishToWitness = () => {
    if (!selectedProof) return;
    updateWitness({
      ...RESET_PRESENT_STATE,
      is_blank: false,
      published_proof_id: selectedProof.id,
      exhibit_label: getPublishLabel(selectedProof),
    });
  };

  const isPublishedToJury = juryState?.published_proof_id === selectedProof?.id && !juryState?.is_blank;
  const isPublishedToWitness = witnessState?.published_proof_id === selectedProof?.id && !witnessState?.is_blank;
  const juryLocked = !(selectedProof?.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(selectedProof?.status));

  return (
    <div className="flex h-full min-h-screen flex-col bg-[radial-gradient(circle_at_top,#eff6ff,transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] pb-24 lg:pb-0">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Present</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Attorney Central</h1>
            <p className="mt-1 text-sm text-slate-500">Big proof tiles, consistent color coding, and one-tap actions for trial pace.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExhibitsOpen(true)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 xl:hidden"
            >
              <FileText className="h-4 w-4" />
              Exhibits
            </button>
            <button
              type="button"
              onClick={() => setQuestionsOpen(true)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 2xl:hidden"
            >
              <MessageSquare className="h-4 w-4" />
              Questions
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1800px] flex-1 gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="hidden xl:block xl:w-[390px] xl:shrink-0">
          <ProofPanel
            exhibitRoots={exhibitRoots}
            depositionRoots={depositionRoots}
            childrenByParent={childrenByParent}
            questionCountByProofId={questionCountByProofId}
            selectedId={selectedProofId}
            onSelect={(proof) => setSelectedProofId(proof.id)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ActionStrip
            selectedProof={selectedProof}
            linkedQuestions={linkedQuestions}
            juryState={juryState}
            witnessState={witnessState}
            onAdmitExhibit={() => setAdmitTarget(selectedProof)}
            onAdmitDemo={() => setDemoTarget(selectedProof)}
            onUnAdmit={() => setUnAdmitTarget(selectedProof)}
            onPublishJury={publishToJury}
            onUnpublishJury={() => updateJury(RESET_PRESENT_STATE)}
            onPublishWitness={publishToWitness}
            onUnpublishWitness={() => updateWitness(RESET_PRESENT_STATE)}
          />
          <div className="min-h-0 flex-1">
            <PreviewCanvas proof={selectedProof} allProofs={proofs} />
          </div>
        </div>

        <div className="hidden 2xl:block 2xl:w-[390px] 2xl:shrink-0">
          <QuestionPanel
            questions={questions}
            linkedQuestions={linkedQuestions}
            proofsById={proofById}
            resolveProofSelection={resolveProofSelection}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={setSelectedQuestionId}
          />
        </div>
      </div>

      <div className="xl:hidden">
        {exhibitsOpen && <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={() => setExhibitsOpen(false)} />}
        <ProofPanel
          mobile
          open={exhibitsOpen}
          onClose={() => setExhibitsOpen(false)}
          exhibitRoots={exhibitRoots}
          depositionRoots={depositionRoots}
          childrenByParent={childrenByParent}
          questionCountByProofId={questionCountByProofId}
          selectedId={selectedProofId}
          onSelect={(proof) => setSelectedProofId(proof.id)}
        />
      </div>

      <div className="2xl:hidden">
        {questionsOpen && <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={() => setQuestionsOpen(false)} />}
        <QuestionPanel
          mobile
          open={questionsOpen}
          onClose={() => setQuestionsOpen(false)}
          questions={questions}
          linkedQuestions={linkedQuestions}
          proofsById={proofById}
          resolveProofSelection={resolveProofSelection}
          selectedQuestionId={selectedQuestionId}
          onSelectQuestion={setSelectedQuestionId}
        />
      </div>

      <MobileDock
        onOpenExhibits={() => setExhibitsOpen(true)}
        onOpenQuestions={() => setQuestionsOpen(true)}
        onToggleWitness={() => (isPublishedToWitness ? updateWitness(RESET_PRESENT_STATE) : publishToWitness())}
        onToggleJury={() => (isPublishedToJury ? updateJury(RESET_PRESENT_STATE) : publishToJury())}
        witnessPublished={isPublishedToWitness}
        juryPublished={isPublishedToJury}
        juryDisabled={juryLocked}
      />

      <AdmitAsExhibitModal open={Boolean(admitTarget)} onClose={() => setAdmitTarget(null)} proof={admitTarget} />
      <AdmitAsDemonstrativeModal open={Boolean(demoTarget)} onClose={() => setDemoTarget(null)} proof={demoTarget} />
      <UnAdmitModal open={Boolean(unAdmitTarget)} onClose={() => setUnAdmitTarget(null)} proof={unAdmitTarget} />
    </div>
  );
}