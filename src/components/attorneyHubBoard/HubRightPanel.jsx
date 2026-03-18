import React, { useMemo } from 'react';
import { buildAdmissionSteps } from '@/lib/admissionSteps';
import { getProofDisplayLabel, isProofPublishable } from '@/components/attorneyHub/mindMapUtils';
import ProofPreviewCard from '@/components/attorneyHub/ProofPreviewCard.jsx';

export default function HubRightPanel({
  selectedBucket,
  selectedGroup,
  selectedBlock,
  selectedProof,
  admissionTemplates = [],
  juryState,
  liveSync,
  onToggleLiveSync,
  onPublishProof,
  onBlankJury,
  onPreviewStateChange,
}) {
  const previewProof = selectedProof || (selectedBlock ? selectedBlock.proof : selectedGroup?.focusProof || null);
  const published = previewProof && juryState?.published_proof_id === previewProof.id && !juryState?.is_blank;
  const publishable = previewProof ? isProofPublishable(previewProof) : false;

  const admissionSteps = useMemo(() => {
    if (!selectedBlock?.block || !selectedBlock?.proof) return [];
    return buildAdmissionSteps(
      selectedBlock.block,
      admissionTemplates,
      selectedBlock.proof.admitted_exhibit_num || selectedBlock.proof.demonstrative_exhibit_num || selectedBlock.proof.joint_exhibit_num || ''
    );
  }, [selectedBlock, admissionTemplates]);

  return (
    <div className="h-full w-[360px] flex-shrink-0 border-l border-slate-200 bg-slate-50/80 overflow-y-auto">
      <div className="space-y-4 p-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Quick View</p>

          {selectedBucket && !selectedGroup && (
            <div className="mt-3">
              <p className="text-lg font-bold text-slate-900">{selectedBucket.name}</p>
              <p className="mt-1 text-sm text-slate-500">Pick a group to see the live proof and question path.</p>
            </div>
          )}

          {selectedGroup && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{selectedGroup.name}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedBucket?.name}</p>
              </div>
              {selectedGroup.why_it_matters ? <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{selectedGroup.why_it_matters}</p> : null}
              {selectedGroup.focusProof ? (
                <div className="rounded-2xl border border-slate-200 bg-cyan-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Focused Proof</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{getProofDisplayLabel(selectedGroup.focusProof)}</p>
                </div>
              ) : null}
            </div>
          )}

          {selectedBlock && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-lg font-bold text-slate-900">Admission Block</p>
                <p className="mt-1 text-sm text-slate-500">{selectedBlock.proof ? getProofDisplayLabel(selectedBlock.proof) : 'Proof'}</p>
              </div>
              <div className="space-y-2">
                {admissionSteps.map((step) => (
                  <div key={step.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-500">{step.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                    {step.text ? <p className="mt-1 text-xs text-slate-600">{step.text}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {previewProof && (
          <ProofPreviewCard
            proof={previewProof}
            onStateChange={onPreviewStateChange}
            publishable={publishable}
            published={!!published}
            liveSync={liveSync}
            onToggleLiveSync={onToggleLiveSync}
            onPublish={() => onPublishProof(previewProof)}
            onBlankJury={onBlankJury}
          />
        )}
      </div>
    </div>
  );
}