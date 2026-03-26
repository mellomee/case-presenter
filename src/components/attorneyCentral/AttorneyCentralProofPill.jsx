import React from 'react';
import { getProofNumber, getProofStatusMeta, getProofTypeMeta } from '@/lib/attorneyCentralUtils';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function AttorneyCentralProofPill({ proof, localDecision = null, onClick, compact = false, relationLabel = '' }) {
  const status = getProofStatusMeta(proof, localDecision);
  const type = getProofTypeMeta(proof);
  const exhibitNumber = getProofNumber(proof);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border border-white/30 bg-white/85 text-left shadow-sm backdrop-blur transition hover:bg-white ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Exhibit #</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{exhibitNumber}</div>
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-sm font-semibold leading-tight text-slate-900">{getProofDisplayName(proof)}</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${type.className}`}>{type.label}</span>
          {relationLabel ? <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{relationLabel}</span> : null}
        </div>
        {proof?.formal_name && proof.formal_name !== proof.name ? <div className="text-xs text-slate-500">{proof.formal_name}</div> : null}
      </div>
    </button>
  );
}