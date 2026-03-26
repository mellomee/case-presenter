import React from 'react';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { getProofNumber, getProofStatusMeta, getProofTypeMeta } from '@/lib/attorneyCentralUtils';

export default function AttorneyCentralStageInfo({ proof, proofsById = {}, localDecision = null, linkedQuestionCount = 0 }) {
  if (!proof) return null;

  const status = getProofStatusMeta(proof, localDecision);
  const type = getProofTypeMeta(proof);
  const parent = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;

  return (
    <div className="absolute bottom-32 left-4 z-20 max-w-[min(32rem,calc(100vw-2rem))] rounded-[24px] border border-white/20 bg-slate-950/70 p-4 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-900">#{getProofNumber(proof)}</div>
        <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</div>
        <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${type.className}`}>{type.label}</div>
        {linkedQuestionCount > 0 ? <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100">{linkedQuestionCount} linked question{linkedQuestionCount === 1 ? '' : 's'}</div> : null}
      </div>
      <div className="mt-3 text-lg font-bold leading-tight">{getProofDisplayName(proof)}</div>
      {parent ? <div className="mt-2 text-sm text-slate-200">Parent: <span className="font-semibold text-white">{getProofDisplayName(parent)}</span></div> : null}
      {proof.formal_name && proof.formal_name !== proof.name ? <div className="mt-1 text-sm text-slate-300">Formal name: {proof.formal_name}</div> : null}
    </div>
  );
}