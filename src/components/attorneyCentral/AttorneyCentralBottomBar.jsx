import React from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canPublishToJury, canPublishToWitness, getExhibitLabel, getProofTypeLabel } from '@/lib/attorneyCentralUtils';

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function AttorneyCentralBottomBar({ proof, elapsedSeconds, isTimerRunning, onStartTimer, onPauseTimer, onResetTimer, juryPublished, witnessPublished, onPublishJury, onUnpublishJury, onPublishWitness, onUnpublishWitness, onAdmitExhibit, onAdmitDemo, onUnadmit }) {
  const canJury = canPublishToJury(proof);
  const canWitness = canPublishToWitness(proof);
  const canAdmitExhibit = proof?.proof_category === 'Exhibit' && proof?.status === 'Joint';
  const canAdmitDemo = proof?.proof_category === 'Exhibit' && proof?.status === 'Joint';
  const canUnadmit = proof?.proof_category === 'Exhibit' && ['Admitted', 'Demonstrative'].includes(proof?.status);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={onStartTimer}><Play className="h-4 w-4 fill-current" /></Button>
          <Button type="button" variant="outline" size="icon" onClick={onPauseTimer}><Pause className="h-4 w-4 fill-current" /></Button>
          <Button type="button" variant="outline" size="icon" onClick={onResetTimer}><Square className="h-4 w-4 fill-current" /></Button>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
            {formatElapsedTime(elapsedSeconds)}{isTimerRunning ? ' • Live' : ''}
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {proof ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{getExhibitLabel(proof)}</span>
              <span className="font-semibold text-slate-900">{proof.formal_name || proof.name}</span>
              <span>•</span>
              <span>{getProofTypeLabel(proof)}</span>
              <span>•</span>
              <span>{proof.proof_category === 'Deposition' ? 'Deposition' : proof.status}</span>
            </div>
          ) : 'Select a proof to present.'}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {juryPublished ? (
            <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={onUnpublishJury}>Unpublish Jury</Button>
          ) : (
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" disabled={!canJury} onClick={onPublishJury}>Publish Jury</Button>
          )}

          {witnessPublished ? (
            <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={onUnpublishWitness}>Unpublish Witness</Button>
          ) : (
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" disabled={!canWitness} onClick={onPublishWitness}>Publish Witness</Button>
          )}

          {canAdmitExhibit && <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={onAdmitExhibit}>Admit Exhibit</Button>}
          {canAdmitDemo && <Button type="button" className="bg-purple-600 hover:bg-purple-700" onClick={onAdmitDemo}>Admit Demo</Button>}
          {canUnadmit && <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={onUnadmit}>Un-Admit</Button>}
        </div>
      </div>
    </div>
  );
}