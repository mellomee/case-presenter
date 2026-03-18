import React from 'react';
import { Eye } from 'lucide-react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function GroupPreviewPane({ label, attachedProofs = [], onPreviewProof }) {
  return (
    <div className="h-full rounded-xl border border-slate-700 bg-slate-900/60 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-300 bg-white min-h-[24rem] p-10 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 mb-4 text-center">Question Group</p>
        <p className="text-3xl font-bold text-slate-800 leading-tight text-center">{label || 'Untitled Group'}</p>
        {attachedProofs.length > 0 && (
          <div className="mt-10">
            <p className="text-sm font-semibold text-slate-700 mb-4">Attached proofs</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {attachedProofs.map((proof) => (
                <div key={proof.id} className="relative rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <button
                    type="button"
                    onClick={() => onPreviewProof?.(proof)}
                    className="absolute right-2 top-2 h-7 w-7 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900"
                    title="Preview proof"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex justify-center">
                    <ProofThumbPreview proof={proof} size="sm" />
                  </div>
                  <p className="mt-2 max-w-20 text-[11px] text-slate-600 leading-tight">{getProofDisplayName(proof)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}