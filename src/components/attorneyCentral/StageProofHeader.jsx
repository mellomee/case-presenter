import React from 'react';
import { getExhibitLabel, getProofDisplayLabel, getProofStatusTone, getProofTypeLabel, getProofTypeTone } from '@/lib/attorneyCentralUtils';

export default function StageProofHeader({ proof, parentProof }) {
  if (!proof) return null;

  return (
    <div className="absolute left-4 top-4 z-20 max-w-[calc(100%-2rem)] space-y-2">
      {parentProof && (
        <div className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
          From {getProofDisplayLabel(parentProof)}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-300 bg-slate-900 px-3 py-1 text-sm font-bold text-white">
            {getExhibitLabel(proof)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getProofStatusTone(proof)}`}>
            {proof.proof_category === 'Deposition' ? 'Deposition' : proof.status}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getProofTypeTone(proof)}`}>
            {getProofTypeLabel(proof)}
          </span>
        </div>
        <div className="mt-3">
          <p className="text-lg font-bold text-slate-900">{getProofDisplayLabel(proof)}</p>
          {proof.description ? <p className="mt-1 text-sm text-slate-600">{proof.description}</p> : null}
        </div>
      </div>
    </div>
  );
}