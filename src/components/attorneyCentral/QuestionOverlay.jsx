import React from 'react';
import { getExhibitNumber, getLinkedProofs, getStatusClasses, getTypeClasses, getTypeLabel, getProofStatusLabel } from '@/lib/attorneyCentral';

export default function QuestionOverlay({ open, questions = [], proofMap, onSelectProof, onClose }) {
  return (
    <aside className={`fixed inset-y-0 right-0 z-40 w-[25rem] max-w-[94vw] transform border-l border-zinc-800 bg-zinc-950/92 backdrop-blur-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Question linkage</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Exam questions</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">Close</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {questions.map((question, index) => {
            const linkedProofs = getLinkedProofs(question, proofMap);
            return (
              <div key={question.id} className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300">Q{index + 1}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${question.type === 'Cross' ? 'bg-red-500/15 text-red-200' : 'bg-emerald-500/15 text-emerald-200'}`}>{question.type}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-100">{question.text}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {linkedProofs.length === 0 && <span className="text-xs text-zinc-500">No proofs linked</span>}
                  {linkedProofs.map((proof) => (
                    <button key={proof.id} onClick={() => onSelectProof(proof)} className="rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-left hover:border-zinc-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-zinc-700 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white">{getExhibitNumber(proof)}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(proof)}`}>{getProofStatusLabel(proof)}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getTypeClasses(proof)}`}>{getTypeLabel(proof)}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-white">{proof.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{proof.formal_name || 'No formal name yet'}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}