import React from 'react';
import { Play, Pause, Square, ExternalLink } from 'lucide-react';
import { formatElapsedTime } from '@/lib/attorneyCentralUtils';

function DockButton({ active = false, danger = false, disabled = false, children, onClick }) {
  const className = danger
    ? 'border-red-200 bg-red-500 text-white hover:bg-red-600'
    : active
      ? 'border-blue-200 bg-blue-600 text-white hover:bg-blue-700'
      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100';

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`min-h-[48px] rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export default function AttorneyCentralBottomDock({
  selectedProof,
  elapsedSeconds,
  isTimerRunning,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  canPublish,
  isPublished,
  onPublish,
  onUnpublish,
  canPublishToWitness,
  isPublishedToWitness,
  onPublishToWitness,
  onUnpublishToWitness,
  onAdmitExhibit,
  onAdmitDemo,
  onUnAdmit,
  onToggleReject,
  rejectActive,
}) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-30 rounded-[28px] border border-white/35 bg-white/92 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DockButton onClick={onStartTimer}><Play className="mr-2 inline h-4 w-4" />Start</DockButton>
          <DockButton onClick={onPauseTimer}><Pause className="mr-2 inline h-4 w-4" />Pause</DockButton>
          <DockButton onClick={onResetTimer}><Square className="mr-2 inline h-4 w-4" />Reset</DockButton>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900">{formatElapsedTime(elapsedSeconds)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DockButton disabled={!selectedProof || !canPublishToWitness} active={!isPublishedToWitness} danger={isPublishedToWitness} onClick={isPublishedToWitness ? onUnpublishToWitness : onPublishToWitness}>
            <ExternalLink className="mr-2 inline h-4 w-4" />{isPublishedToWitness ? 'Unpublish Witness' : 'Publish to Witness'}
          </DockButton>
          <DockButton disabled={!selectedProof || !canPublish} active={!isPublished} danger={isPublished} onClick={isPublished ? onUnpublish : onPublish}>
            {isPublished ? 'Unpublish Jury' : 'Publish to Jury'}
          </DockButton>
          <DockButton disabled={!selectedProof || selectedProof?.proof_category === 'Deposition' || selectedProof?.status !== 'Joint'} onClick={onAdmitExhibit}>Admit as Exhibit</DockButton>
          <DockButton disabled={!selectedProof || selectedProof?.proof_category === 'Deposition' || selectedProof?.status !== 'Joint'} onClick={onAdmitDemo}>Admit as Demo</DockButton>
          <DockButton disabled={!selectedProof || !['Admitted', 'Demonstrative'].includes(selectedProof?.status)} onClick={onUnAdmit}>Un-Admit</DockButton>
          <DockButton disabled={!selectedProof || selectedProof?.proof_category === 'Deposition' || selectedProof?.status !== 'Joint'} onClick={onToggleReject} danger={rejectActive}>{rejectActive ? 'Un-Reject' : 'Reject'}</DockButton>
        </div>
      </div>
    </div>
  );
}