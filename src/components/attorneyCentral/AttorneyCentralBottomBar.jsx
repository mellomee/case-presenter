import React from 'react';
import { ExternalLink, Pause, Play, Square } from 'lucide-react';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { getProofKindLabel, getProofNumber, getProofStatusConfig } from '@/lib/attorneyCentralUtils';
import ProofLifecycleSteps from '@/components/attorneyCentral/ProofLifecycleSteps.jsx';

export default function AttorneyCentralBottomBar({
  selectedProof,
  localDecision,
  isTimerRunning,
  elapsedLabel,
  currentTimeLabel,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  canPublishToJury,
  isPublishedToJury,
  onPublishToJury,
  onUnpublishFromJury,
  canPublishToWitness,
  isPublishedToWitness,
  onPublishToWitness,
  onUnpublishFromWitness,
  onRejectToggle,
  onAdmitExhibit,
  onAdmitDemo,
  onUnAdmit,
}) {
  const status = getProofStatusConfig(selectedProof, localDecision);

  return (
    <div className="border-t border-stone-200 bg-[#f7f0e6] px-3 py-2 shadow-[0_-8px_24px_rgba(120,94,63,0.06)]">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 xl:w-auto xl:flex-col xl:items-stretch xl:justify-start">
          <div className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-1.5 py-1.5 shadow-sm">
            <button type="button" onClick={onStartTimer} className={`rounded-xl p-2 ${isTimerRunning ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}><Play className="h-4 w-4" /></button>
            <button type="button" onClick={onPauseTimer} className="rounded-xl p-2 text-stone-600 hover:bg-stone-100"><Pause className="h-4 w-4" /></button>
            <button type="button" onClick={onResetTimer} className="rounded-xl p-2 text-stone-600 hover:bg-stone-100"><Square className="h-4 w-4" /></button>
            <div className="ml-1 rounded-xl bg-stone-100 px-2.5 py-1.5 text-xs font-black text-stone-900">{elapsedLabel}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm">{currentTimeLabel}</div>
        </div>

        <div className="min-w-0 flex-1 rounded-[1.5rem] border border-stone-200 bg-white px-3 py-3 shadow-sm">
          {selectedProof ? (
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black tracking-[0.16em] ${status.accent}`}>{getProofNumber(selectedProof)}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.pill}`}>{status.label}</span>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">{getProofKindLabel(selectedProof)}</span>
                </div>
                <p className="mt-2 truncate text-sm font-bold text-stone-900">{selectedProof.formal_name || getProofDisplayName(selectedProof)}</p>
              </div>

              <ProofLifecycleSteps
                selectedProof={selectedProof}
                canPublishToWitness={canPublishToWitness}
                isPublishedToWitness={isPublishedToWitness}
                onPublishToWitness={onPublishToWitness}
                onUnpublishFromWitness={onUnpublishFromWitness}
                canPublishToJury={canPublishToJury}
                isPublishedToJury={isPublishedToJury}
                onPublishToJury={onPublishToJury}
                onUnpublishFromJury={onUnpublishFromJury}
                localDecision={localDecision}
                onRejectToggle={onRejectToggle}
                onAdmitExhibit={onAdmitExhibit}
                onAdmitDemo={onAdmitDemo}
                onUnAdmit={onUnAdmit}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
              <ExternalLink className="h-4 w-4" /> Select a proof to control publish and admit actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}