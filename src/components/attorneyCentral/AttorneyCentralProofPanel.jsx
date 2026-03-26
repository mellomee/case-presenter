import React from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getPartyTone,
  getProofDisplayName,
  getProofExhibitNumber,
  getProofPartyNames,
  getProofStatusClasses,
  getProofStatusLabel,
} from './attorneyCentralUtils';

function ProofRow({ entry, partiesById, selectedProofId, onSelectProof }) {
  const { proof, depth } = entry;
  const partyNames = getProofPartyNames(proof, partiesById);
  const primaryParty = partiesById[proof.party_id];
  const exhibitNumber = getProofExhibitNumber(proof);
  const isSelected = selectedProofId === proof.id;

  return (
    <button
      type="button"
      onClick={() => onSelectProof(proof.id)}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
      style={{ marginLeft: `${Math.min(depth, 3) * 14}px` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`border ${getProofStatusClasses(proof)}`}>{getProofStatusLabel(proof)}</Badge>
        {exhibitNumber ? <Badge variant="outline" className="border-slate-200 text-slate-700">{exhibitNumber}</Badge> : null}
        <Badge variant="outline" className="border-slate-200 text-slate-700">{proof.file_type}</Badge>
        {primaryParty ? <Badge className={`border ${getPartyTone(primaryParty.side)}`}>{primaryParty.side}</Badge> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
      {proof.name && proof.formal_name ? <p className="mt-1 text-xs text-slate-500">Internal: {proof.name}</p> : null}
      {partyNames.length ? <p className="mt-2 text-xs text-slate-600">{partyNames.join(' • ')}</p> : null}
    </button>
  );
}

export default function AttorneyCentralProofPanel({
  collapsed,
  onToggle,
  search,
  onSearchChange,
  exhibitEntries,
  depositionEntries,
  partiesById,
  selectedProofId,
  onSelectProof,
}) {
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-3 bg-white px-3 py-4">
        <button type="button" onClick={onToggle} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Exhibits</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Left Panel</p>
            <h2 className="text-lg font-bold text-slate-900">Marked Exhibits</h2>
          </div>
          <button type="button" onClick={onToggle} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search proof, exhibit #, or party" className="pl-9" />
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Exhibits</h3>
            <span className="text-xs text-slate-500">{exhibitEntries.length}</span>
          </div>
          <div className="space-y-3">
            {exhibitEntries.length ? exhibitEntries.map((entry) => (
              <ProofRow
                key={entry.proof.id}
                entry={entry}
                partiesById={partiesById}
                selectedProofId={selectedProofId}
                onSelectProof={onSelectProof}
              />
            )) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No marked exhibits match this search.</div>}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Depositions</h3>
            <span className="text-xs text-slate-500">{depositionEntries.length}</span>
          </div>
          <div className="space-y-3">
            {depositionEntries.length ? depositionEntries.map((entry) => (
              <ProofRow
                key={entry.proof.id}
                entry={entry}
                partiesById={partiesById}
                selectedProofId={selectedProofId}
                onSelectProof={onSelectProof}
              />
            )) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No depositions match this search.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}