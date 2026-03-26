import React from 'react';
import { ExternalLink, Pause, Play, Square } from 'lucide-react';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { getProofKindLabel, getProofNumber, getProofStatusConfig } from '@/lib/attorneyCentralUtils';

function ActionButton({ label, onClick, disabled = false, tone = 'light' }) {
  const tones = {
    light: 'border-stone-200 bg-white text-stone-800 hover:bg-stone-100',
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    red: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
    emerald: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    violet: 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700',
    rose: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

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
  const isJointExhibit = selectedProof?.proof_category === 'Exhibit' && selectedProof?.status === 'Joint';
  const isAdmittedProof = selectedProof?.proof_category === 'Exhibit' && ['Admitted', 'Demonstrative'].includes(selectedProof?.status);

  return (
    <div className="border-t border-stone-200 bg-[#f7f0e6] px-4 py-3 shadow-[0_-8px_32px_rgba(120,94,63,0.08)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-3xl border border-stone-200 bg-white px-2 py-2 shadow-sm">
            <button type="button" onClick={onStartTimer} className={`rounded-2xl p-2 ${isTimerRunning ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}><Play className="h-4 w-4" /></button>
            <button type="button" onClick={onPauseTimer} className="rounded-2xl p-2 text-stone-600 hover:bg-stone-100"><Pause className="h-4 w-4" /></button>
            <button type="button" onClick={onResetTimer} className="rounded-2xl p-2 text-stone-600 hover:bg-stone-100"><Square className="h-4 w-4" /></button>
            <div className="ml-1 rounded-2xl bg-stone-100 px-3 py-2 text-sm font-black text-stone-900">{elapsedLabel}</div>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm">{currentTimeLabel}</div>
        </div>

        <div className="min-w-0 flex-1 rounded-[2rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
          {selectedProof ? (
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black tracking-[0.18em] ${status.accent}`}>{getProofNumber(selectedProof)}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.pill}`}>{status.label}</span>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">{getProofKindLabel(selectedProof)}</span>
                </div>
                <p className="mt-3 truncate text-base font-bold text-stone-900">{selectedProof.formal_name || getProofDisplayName(selectedProof)}</p>
                {selectedProof.formal_name && selectedProof.name ? <p className="mt-1 text-xs text-stone-500">Internal name: {selectedProof.name}</p> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ActionButton label={isPublishedToWitness ? 'Unpublish Witness' : 'Publish Witness'} onClick={isPublishedToWitness ? onUnpublishFromWitness : onPublishToWitness} disabled={!isPublishedToWitness && !canPublishToWitness} tone={isPublishedToWitness ? 'red' : 'blue'} />
                <ActionButton label={isPublishedToJury ? 'Unpublish Jury' : 'Publish Jury'} onClick={isPublishedToJury ? onUnpublishFromJury : onPublishToJury} disabled={!isPublishedToJury && !canPublishToJury} tone={isPublishedToJury ? 'red' : 'blue'} />
                {isJointExhibit ? (
                  <>
                    <ActionButton label={localDecision === 'not_admitted' ? 'Undo Reject' : 'Reject'} onClick={onRejectToggle} tone={localDecision === 'not_admitted' ? 'rose' : 'light'} />
                    <ActionButton label="Admit Exhibit" onClick={onAdmitExhibit} tone="emerald" />
                    <ActionButton label="Admit Demo" onClick={onAdmitDemo} tone="violet" />
                  </>
                ) : null}
                {isAdmittedProof ? <ActionButton label="Un-Admit" onClick={onUnAdmit} tone="light" /> : null}
              </div>
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