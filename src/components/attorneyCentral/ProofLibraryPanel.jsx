import React from 'react';
import { ChevronRight } from 'lucide-react';
import { getExhibitNumber, getExhibitTrail, getStatusClasses, getTypeClasses, getTypeLabel, getProofStatusLabel } from '@/lib/attorneyCentral';

export default function ProofLibraryPanel({ open, sections = [], selectedProofId, juryProofId, witnessProofId, onSelectProof, onClose }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-[24rem] max-w-[92vw] transform border-r border-zinc-800 bg-zinc-950/92 backdrop-blur-xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Attorney Central</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Proof Library</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {sections.map((section) => (
            <div key={section.key} className="mb-7">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{section.eyebrow}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{section.title}</h3>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">{section.families.length}</span>
              </div>

              <div className="space-y-4">
                {section.families.map((family) => {
                  const proof = family.root;
                  const isActive = selectedProofId === proof.id;
                  const history = getExhibitTrail(proof);
                  return (
                    <button key={proof.id} onClick={() => onSelectProof(proof)} className={`w-full rounded-[1.4rem] border p-4 text-left transition-all ${isActive ? 'border-white/40 bg-zinc-900 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]' : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-600 hover:bg-zinc-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.32em] text-zinc-500">{section.title.slice(0, -1)} proof</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full border border-zinc-700 bg-black/30 px-3 py-1 text-base font-semibold text-white">{getExhibitNumber(proof)}</span>
                            {juryProofId === proof.id && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200">On jury</span>}
                            {witnessProofId === proof.id && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-200">On witness</span>}
                          </div>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 text-zinc-500" />
                      </div>

                      <h4 className="mt-4 text-lg font-semibold text-white">{proof.name}</h4>
                      <p className="mt-1 truncate text-sm text-zinc-400">{proof.formal_name || 'No formal name yet'}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(proof)}`}>{getProofStatusLabel(proof)}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getTypeClasses(proof)}`}>{getTypeLabel(proof)}</span>
                        {family.children.length > 0 && <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-300">{family.children.length} child {family.children.length === 1 ? 'tile' : 'tiles'}</span>}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {history.map((item) => (
                          <span key={item.label} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.classes}`}>{item.label}: {item.value}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}