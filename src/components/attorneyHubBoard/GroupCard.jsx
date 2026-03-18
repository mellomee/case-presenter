import React from 'react';
import QuestionChecklist from './QuestionChecklist.jsx';
import { getProofDisplayLabel } from '@/components/attorneyHub/mindMapUtils';

function badgeClass(tone) {
  if (tone === 'green') return 'bg-emerald-100 text-emerald-700';
  if (tone === 'amber') return 'bg-amber-100 text-amber-700';
  if (tone === 'purple') return 'bg-purple-100 text-purple-700';
  if (tone === 'red') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

export default function GroupCard({
  group,
  questions = [],
  proofFocuses = [],
  admissionBlocks = [],
  proofMap = new Map(),
  partyMap = new Map(),
  askedQuestionIds = {},
  onToggleAsked,
  onSelectProof,
  onOpenBlock,
  onSetBlockOutcome,
  selected = false,
  onSelectGroup,
  blockOutcomes = {},
}) {
  const focusProof = group.proof_id ? proofMap.get(group.proof_id) : null;

  return (
    <div className={`rounded-[30px] border p-4 shadow-sm transition ${selected ? 'border-blue-500 bg-blue-50/70' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <button onClick={onSelectGroup} className="text-left">
            <p className="text-lg font-bold text-slate-900">{group.node_label || group.name}</p>
          </button>
          {group.why_it_matters ? <p className="mt-1 text-sm text-slate-600">{group.why_it_matters}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{questions.length} questions</span>
            {focusProof ? <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">Proof focused</span> : null}
            {admissionBlocks.length > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{admissionBlocks.length} admission block{admissionBlocks.length === 1 ? '' : 's'}</span> : null}
          </div>
        </div>
        {focusProof ? (
          <button onClick={() => onSelectProof(focusProof.id)} className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-left hover:bg-cyan-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Focus Proof</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{getProofDisplayLabel(focusProof)}</p>
          </button>
        ) : null}
      </div>

      {proofFocuses.length > 0 && (
        <div className="mt-4 grid gap-2 xl:grid-cols-2">
          {proofFocuses.map((focus) => {
            const proof = proofMap.get(focus.proof_id);
            const witness = partyMap.get(focus.witness_party_id);
            return (
              <button
                key={focus.id}
                onClick={() => proof && onSelectProof(proof.id)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{focus.label || proof?.formal_name || proof?.name || 'Proof note'}</p>
                  {proof?.status ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass(proof.status === 'Admitted' ? 'green' : proof.status === 'Demonstrative' ? 'purple' : 'slate')}`}>{proof.status}</span> : null}
                </div>
                {focus.quote_or_line ? <p className="mt-1 text-xs text-slate-500">{focus.quote_or_line}</p> : null}
                {focus.why_it_matters ? <p className="mt-2 text-xs text-slate-700">{focus.why_it_matters}</p> : null}
                {witness ? <p className="mt-2 text-[11px] font-semibold text-cyan-700">Witness: {witness.first_name} {witness.last_name}</p> : null}
              </button>
            );
          })}
        </div>
      )}

      {admissionBlocks.length > 0 && (
        <div className="mt-4 space-y-2">
          {admissionBlocks.map((block) => {
            const proof = proofMap.get(block.proof_id);
            const outcome = blockOutcomes[block.id] || 'needs_admission';
            return (
              <div key={block.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <button onClick={() => onOpenBlock(block.id)} className="text-left">
                      <p className="text-sm font-semibold text-slate-900">Admission · {proof ? getProofDisplayLabel(proof) : 'Proof'}</p>
                    </button>
                    <p className="mt-1 text-xs text-slate-600">{proof?.formal_name || proof?.name || 'Foundation reminder'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badgeClass(outcome === 'admitted' ? 'green' : outcome === 'demonstrative' ? 'purple' : outcome === 'not_admitted' ? 'red' : 'amber')}`}>
                      {outcome === 'admitted' ? 'Admitted' : outcome === 'demonstrative' ? 'Demonstrative' : outcome === 'not_admitted' ? 'Not Admitted' : 'Needs Admission'}
                    </span>
                    <button onClick={() => onSetBlockOutcome(block, 'admitted')} className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Admit</button>
                    <button onClick={() => onSetBlockOutcome(block, 'demonstrative')} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">Demo</button>
                    <button onClick={() => onSetBlockOutcome(block, 'not_admitted')} className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Not Admit</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <QuestionChecklist
          questions={questions}
          proofMap={proofMap}
          askedQuestionIds={askedQuestionIds}
          onToggleAsked={onToggleAsked}
          onSelectProof={onSelectProof}
        />
      </div>
    </div>
  );
}