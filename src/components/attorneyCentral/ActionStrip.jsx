import React from 'react';
import { Button } from '@/components/ui/button';
import {
  getDisplayStatus,
  getPrimaryExhibitLabel,
  getProofTypeLabel,
  getStatusClasses,
  getTypeClasses,
} from './attorneyCentralUtils';

export default function ActionStrip({
  selectedProof,
  linkedQuestions,
  juryState,
  witnessState,
  onAdmitExhibit,
  onAdmitDemo,
  onUnAdmit,
  onPublishJury,
  onUnpublishJury,
  onPublishWitness,
  onUnpublishWitness,
}) {
  if (!selectedProof) return null;

  const isPublishedToJury = juryState?.published_proof_id === selectedProof.id && !juryState?.is_blank;
  const isPublishedToWitness = witnessState?.published_proof_id === selectedProof.id && !witnessState?.is_blank;
  const canPublishToJury = selectedProof.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(selectedProof.status);
  const canAdmit = selectedProof.proof_category === 'Exhibit' && selectedProof.status === 'Joint';
  const canUnAdmit = ['Admitted', 'Demonstrative'].includes(selectedProof.status);

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{getPrimaryExhibitLabel(selectedProof)}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getTypeClasses(selectedProof)}`}>{getProofTypeLabel(selectedProof)}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(selectedProof)}`}>{getDisplayStatus(selectedProof)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{linkedQuestions.length} linked question{linkedQuestions.length === 1 ? '' : 's'}</span>
          </div>

          <div>
            <h1 className="truncate text-2xl font-bold text-slate-900">{selectedProof.formal_name || selectedProof.name}</h1>
            {selectedProof.formal_name && <p className="mt-1 truncate text-sm text-slate-500">Internal: {selectedProof.name}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canAdmit && (
            <>
              <Button onClick={onAdmitExhibit} className="min-h-[52px] rounded-2xl bg-emerald-600 px-5 text-sm font-semibold hover:bg-emerald-700">
                Admit Exhibit
              </Button>
              <Button onClick={onAdmitDemo} className="min-h-[52px] rounded-2xl bg-purple-600 px-5 text-sm font-semibold hover:bg-purple-700">
                Admit Demo
              </Button>
            </>
          )}

          {canUnAdmit && (
            <Button onClick={onUnAdmit} className="min-h-[52px] rounded-2xl bg-orange-600 px-5 text-sm font-semibold hover:bg-orange-700">
              Un-Admit
            </Button>
          )}

          {isPublishedToWitness ? (
            <Button onClick={onUnpublishWitness} variant="outline" className="min-h-[52px] rounded-2xl border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 hover:bg-red-100">
              Unpublish Witness
            </Button>
          ) : (
            <Button onClick={onPublishWitness} variant="outline" className="min-h-[52px] rounded-2xl border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-700 hover:bg-amber-100">
              Publish Witness
            </Button>
          )}

          {isPublishedToJury ? (
            <Button onClick={onUnpublishJury} variant="outline" className="min-h-[52px] rounded-2xl border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 hover:bg-red-100">
              Unpublish Jury
            </Button>
          ) : (
            <Button
              onClick={onPublishJury}
              disabled={!canPublishToJury}
              className="min-h-[52px] rounded-2xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500"
            >
              Publish Jury
            </Button>
          )}
        </div>
      </div>

      {!canPublishToJury && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
          Jury publish is locked until the proof is admitted. Depositions remain publishable.
        </div>
      )}
    </div>
  );
}