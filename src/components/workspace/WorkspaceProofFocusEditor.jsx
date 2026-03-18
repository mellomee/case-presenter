import React, { useState } from 'react';

export default function WorkspaceProofFocusEditor({ proofs = [], parties = [], group, focuses = [], onCreateFocus, onDeleteFocus }) {
  const [draft, setDraft] = useState({ proofId: '', label: '', quote: '', why: '', witnessPartyId: '' });

  const reset = () => setDraft({ proofId: '', label: '', quote: '', why: '', witnessPartyId: '' });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proof Highlights</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <select value={draft.proofId} onChange={(event) => setDraft((prev) => ({ ...prev, proofId: event.target.value }))} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
          <option value="">Choose proof…</option>
          {proofs.map((proof) => <option key={proof.id} value={proof.id}>{proof.formal_name || proof.name}</option>)}
        </select>
        <input value={draft.label} onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))} placeholder="Short label" className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700" />
        <input value={draft.quote} onChange={(event) => setDraft((prev) => ({ ...prev, quote: event.target.value }))} placeholder="Quote / line / clip" className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 md:col-span-2" />
        <textarea value={draft.why} onChange={(event) => setDraft((prev) => ({ ...prev, why: event.target.value }))} placeholder="Why this matters" rows={2} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 md:col-span-2" />
        <select value={draft.witnessPartyId} onChange={(event) => setDraft((prev) => ({ ...prev, witnessPartyId: event.target.value }))} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
          <option value="">Who can testify to this?</option>
          {parties.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
        </select>
        <button
          onClick={() => {
            if (!draft.proofId) return;
            onCreateFocus(group, draft);
            reset();
          }}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add Proof Focus
        </button>
      </div>

      {focuses.length > 0 && (
        <div className="mt-3 space-y-2">
          {focuses.map((focus) => (
            <div key={focus.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{focus.label || 'Proof note'}</p>
                  {focus.quote_or_line ? <p className="mt-1 text-xs text-slate-500">{focus.quote_or_line}</p> : null}
                  {focus.why_it_matters ? <p className="mt-2 text-xs text-slate-700">{focus.why_it_matters}</p> : null}
                </div>
                <button onClick={() => onDeleteFocus(focus.id)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}