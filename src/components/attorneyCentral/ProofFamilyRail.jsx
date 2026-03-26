import React from 'react';
import { getExhibitNumber, getStatusClasses, getTypeClasses, getTypeLabel, getProofStatusLabel } from '@/lib/attorneyCentral';

export default function ProofFamilyRail({ family, selectedProofId, onSelectProof }) {
  if (!family) return null;

  const items = [family.root, ...family.children];

  return (
    <div className="rounded-[1.8rem] border border-zinc-800 bg-zinc-950/92 p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Parent / child relationship</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Swipe-ready proof rail</h3>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">{items.length} tiles</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((proof, index) => {
          const active = selectedProofId === proof.id;
          return (
            <button
              key={proof.id}
              onClick={() => onSelectProof(proof)}
              className={`min-w-[18rem] flex-1 rounded-[1.5rem] border p-4 text-left transition-all ${active ? 'border-white/35 bg-zinc-900 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]' : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-600'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-zinc-700 bg-black/30 px-3 py-1 text-base font-semibold text-white">{getExhibitNumber(proof)}</span>
                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-zinc-400">{index === 0 ? 'Parent' : 'Child'}</span>
              </div>

              <h4 className="mt-4 text-lg font-semibold text-white">{proof.name}</h4>
              <p className="mt-1 text-sm text-zinc-400">{proof.formal_name || 'No formal name yet'}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(proof)}`}>{getProofStatusLabel(proof)}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getTypeClasses(proof)}`}>{getTypeLabel(proof)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}