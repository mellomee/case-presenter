import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import { useWitnessSync } from '@/components/witnessView/useWitnessSync.jsx';
import AddToJointModal from '@/components/proofVault/AddToJointModal.jsx';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal.jsx';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal.jsx';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal.jsx';
import RemoveFromJointModal from '@/components/proofVault/RemoveFromJointModal.jsx';
import ProofStage from '@/components/attorneyCentral/ProofStage.jsx';
import ProofLibraryPanel from '@/components/attorneyCentral/ProofLibraryPanel.jsx';
import ProofFamilyRail from '@/components/attorneyCentral/ProofFamilyRail.jsx';
import QuestionOverlay from '@/components/attorneyCentral/QuestionOverlay.jsx';
import ActionDock from '@/components/attorneyCentral/ActionDock.jsx';
import { MOCK_PROOFS, MOCK_QUESTIONS, buildProofFamilies, getFamilyForProof, getJuryLabel, sortByFreshness } from '@/lib/attorneyCentral';

export default function AttorneyCentral() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [selectedProofId, setSelectedProofId] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewerSync, setViewerSync] = useState({ currentPage: 1, zoom: 1, panX: 0, panY: 0, currentTime: 0, playing: false });
  const { juryState, update: updateJury } = useJurySync('attorney');
  const { witnessState, update: updateWitness } = useWitnessSync('attorney');

  const { data: proofsRaw = [], isLoading: loadingProofs } = useQuery({
    queryKey: ['attorney-central-proofs'],
    queryFn: () => base44.entities.Proof.list('-updated_date', 500),
    initialData: [],
  });

  const { data: questionsRaw = [] } = useQuery({
    queryKey: ['attorney-central-questions'],
    queryFn: () => base44.entities.Question.list(),
    initialData: [],
  });

  const realFamilies = useMemo(() => buildProofFamilies(proofsRaw), [proofsRaw]);
  const usingMock = !loadingProofs && realFamilies.length === 0;
  const proofs = usingMock ? MOCK_PROOFS : proofsRaw;
  const questions = usingMock ? MOCK_QUESTIONS : sortByFreshness(questionsRaw).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const families = useMemo(() => usingMock ? buildProofFamilies(MOCK_PROOFS) : realFamilies, [usingMock, realFamilies]);
  const proofMap = useMemo(() => new Map(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const selectedProof = proofMap.get(selectedProofId) || families[0]?.root || null;
  const activeFamily = getFamilyForProof(families, selectedProof?.id);
  const modalProof = activeFamily?.root || selectedProof;

  useEffect(() => {
    if (!selectedProofId && families[0]?.root) {
      setSelectedProofId(families[0].root.id);
      return;
    }
    if (selectedProofId && !proofMap.has(selectedProofId) && families[0]?.root) {
      setSelectedProofId(families[0].root.id);
    }
  }, [families, selectedProofId, proofMap]);

  const sections = useMemo(() => ([
    { key: 'exhibits', eyebrow: 'Admit / publish', title: 'Exhibits', families: families.filter((family) => family.root.proof_category === 'Exhibit') },
    { key: 'depositions', eyebrow: 'Video / testimony', title: 'Depositions', families: families.filter((family) => family.root.proof_category === 'Deposition') },
  ]), [families]);

  const juryPublished = juryState?.published_proof_id === selectedProof?.id && !juryState?.is_blank;
  const witnessPublished = witnessState?.published_proof_id === selectedProof?.id && !witnessState?.is_blank;

  const publishPatch = {
    published_proof_id: selectedProof?.id || null,
    is_blank: false,
    exhibit_label: getJuryLabel(selectedProof),
    pdf_page: viewerSync.currentPage || 1,
    zoom: viewerSync.zoom || 1,
    panX: viewerSync.panX || 0,
    panY: viewerSync.panY || 0,
    video_time: viewerSync.currentTime || 0,
    is_playing: !!viewerSync.playing,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.16),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.14),_transparent_22%),#050507] text-white">
      <ProofLibraryPanel
        open={leftOpen}
        sections={sections}
        selectedProofId={selectedProof?.id}
        juryProofId={juryState?.published_proof_id}
        witnessProofId={witnessState?.published_proof_id}
        onSelectProof={(proof) => setSelectedProofId(proof.id)}
        onClose={() => setLeftOpen(false)}
      />

      <QuestionOverlay
        open={rightOpen}
        questions={questions}
        proofMap={proofMap}
        onSelectProof={(proof) => { setSelectedProofId(proof.id); setRightOpen(false); }}
        onClose={() => setRightOpen(false)}
      />

      <div className={`min-h-screen transition-all duration-300 ${leftOpen ? 'xl:pl-[24rem]' : ''} ${rightOpen ? '2xl:pr-[25rem]' : ''}`}>
        <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-5 px-4 py-4 md:px-6 lg:px-8">
          <ActionDock
            proof={selectedProof}
            juryPublished={juryPublished}
            witnessPublished={witnessPublished}
            onPublishJury={() => selectedProof && updateJury(publishPatch)}
            onPublishWitness={() => selectedProof && updateWitness(publishPatch)}
            onBlankJury={() => updateJury({ published_proof_id: null, is_blank: true, exhibit_label: '' })}
            onBlankWitness={() => updateWitness({ published_proof_id: null, is_blank: true, exhibit_label: '' })}
            onOpenLeft={() => setLeftOpen(true)}
            onOpenRight={() => setRightOpen(true)}
            onAction={setModal}
          />

          <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-h-[42rem] overflow-hidden rounded-[2rem] border border-zinc-800 bg-black/50 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
              <ProofStage proof={selectedProof} allProofs={proofs} syncState={viewerSync} onSyncStateChange={(patch) => setViewerSync((current) => ({ ...current, ...patch }))} />
            </div>

            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/88 p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">At a glance</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Screen status</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.4rem] border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Jury</p>
                  <p className="mt-3 text-base font-semibold text-white">{juryState?.is_blank ? 'Blanked' : (juryState?.exhibit_label || 'Nothing published')}</p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Witness</p>
                  <p className="mt-3 text-base font-semibold text-white">{witnessState?.is_blank ? 'Blanked' : (witnessState?.exhibit_label || 'Nothing published')}</p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Mode</p>
                  <p className="mt-3 text-base font-semibold text-white">Large tiles · overlay panels · fast actions</p>
                  <p className="mt-2 text-sm text-zinc-400">Designed so the attorney can glance, tap once, and keep moving.</p>
                </div>
              </div>
            </div>
          </div>

          <ProofFamilyRail family={activeFamily} selectedProofId={selectedProof?.id} onSelectProof={(proof) => setSelectedProofId(proof.id)} />
        </div>
      </div>

      <AddToJointModal open={modal === 'joint'} onClose={() => setModal(null)} proof={modalProof} />
      <AdmitAsExhibitModal open={modal === 'admit'} onClose={() => setModal(null)} proof={modalProof} />
      <AdmitAsDemonstrativeModal open={modal === 'demo'} onClose={() => setModal(null)} proof={modalProof} />
      <UnAdmitModal open={modal === 'unadmit'} onClose={() => setModal(null)} proof={modalProof} />
      <RemoveFromJointModal open={modal === 'remove'} onClose={() => setModal(null)} proof={modalProof} />
    </div>
  );
}