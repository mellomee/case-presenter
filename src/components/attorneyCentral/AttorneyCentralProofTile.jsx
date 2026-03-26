import React from 'react';
import { getExhibitLabel, getProofDisplayLabel, getProofStatusTone, getProofTypeLabel, getProofTypeTone } from '@/lib/attorneyCentralUtils';

export default function AttorneyCentralProofTile({ proof, questionLabels = [], selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[9rem] w-56 shrink-0 rounded-2xl border bg-white p-3 text-left shadow-sm transition ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">{getExhibitLabel(proof)}</div>
      <div className="mt-3">
        <p className="line-clamp-2 text-sm font-bold text-slate-900">{getProofDisplayLabel(proof)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getProofStatusTone(proof)}`}>
            {proof.proof_category === 'Deposition' ? 'Deposition' : proof.status}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getProofTypeTone(proof)}`}>
            {getProofTypeLabel(proof)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {questionLabels.slice(0, 3).map((label) => (
          <span key={label} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{label}</span>
        ))}
        {questionLabels.length > 3 && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">+{questionLabels.length - 3}</span>}
      </div>
    </button>
  );
}