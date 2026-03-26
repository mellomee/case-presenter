import React from 'react';
import { canPublishToJury, getExhibitNumber, getProofStatusLabel, getTypeLabel } from '@/lib/attorneyCentral';

export default function ActionDock({ proof, juryPublished, witnessPublished, onPublishJury, onPublishWitness, onBlankJury, onBlankWitness, onOpenLeft, onOpenRight, onAction }) {
  if (!proof) return null;

  const juryAllowed = canPublishToJury(proof);
  const isDeposition = proof.proof_category === 'Deposition';

  return (
    <div className="rounded-[1.8rem] border border-zinc-800 bg-zinc-950/92 p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Current proof</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-zinc-700 bg-black/30 px-3 py-1 text-base font-semibold text-white">{getExhibitNumber(proof)}</span>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">{getProofStatusLabel(proof)}</span>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">{getTypeLabel(proof)}</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">{proof.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">{proof.formal_name || 'No formal name yet'}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={onOpenLeft} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white">Proofs</button>
          <button onClick={onOpenRight} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white">Questions</button>
          <button onClick={juryPublished ? onBlankJury : onPublishJury} disabled={!juryPublished && !juryAllowed} className={`rounded-full px-4 py-3 text-sm font-semibold ${juryPublished ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30' : juryAllowed ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>{juryPublished ? 'Blank Jury' : 'Publish Jury'}</button>
          <button onClick={witnessPublished ? onBlankWitness : onPublishWitness} className={`rounded-full px-4 py-3 text-sm font-semibold ${witnessPublished ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30' : 'bg-zinc-100 text-zinc-950 hover:bg-white'}`}>{witnessPublished ? 'Blank Witness' : 'Publish Witness'}</button>
        </div>
      </div>

      {!juryAllowed && !isDeposition && <p className="mt-3 text-sm text-amber-300">Only admitted or demonstrative exhibits can be published to the jury.</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        {proof.proof_category === 'Exhibit' && proof.status === 'Draft' && <button onClick={() => onAction('joint')} className="rounded-full bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-200 ring-1 ring-sky-500/30">Add to Joint</button>}
        {proof.proof_category === 'Exhibit' && proof.status === 'Joint' && <button onClick={() => onAction('admit')} className="rounded-full bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-500/30">Admit Exhibit</button>}
        {proof.proof_category === 'Exhibit' && proof.status === 'Joint' && <button onClick={() => onAction('demo')} className="rounded-full bg-fuchsia-500/15 px-4 py-3 text-sm font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">Admit Demo</button>}
        {proof.proof_category === 'Exhibit' && proof.status === 'Joint' && <button onClick={() => onAction('remove')} className="rounded-full bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-200 ring-1 ring-zinc-700">Back to Draft</button>}
        {proof.proof_category === 'Exhibit' && ['Admitted', 'Demonstrative'].includes(proof.status) && <button onClick={() => onAction('unadmit')} className="rounded-full bg-orange-500/15 px-4 py-3 text-sm font-semibold text-orange-200 ring-1 ring-orange-500/30">Un-Admit</button>}
      </div>
    </div>
  );
}