import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import { getJointLabel, getProofDisplayName, getProofTypeLabel, parseIdsField } from '@/lib/examV2Utils';

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getProofPartyText(proof, parties) {
  const partyIds = [...new Set([proof?.party_id, ...parseIdsField(proof?.party_ids)].filter(Boolean))];
  return partyIds
    .map((partyId) => parties.find((party) => party.id === partyId))
    .filter(Boolean)
    .map((party) => `${party.first_name} ${party.last_name}`.trim())
    .join(' ')
    .toLowerCase();
}

export default function ProofPickerDialog({ open, onOpenChange, proofs = [], parties = [], onSelect }) {
  const [tab, setTab] = useState('Exhibit');
  const [selectedId, setSelectedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab('Exhibit');
    setSelectedId('');
    setSearchQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const next = proofs.filter((proof) => proof.proof_category === tab);
    const searchTerm = normalizeSearchValue(searchQuery);
    if (!searchTerm) return next;

    return next.filter((proof) => {
      const values = [
        proof.name,
        proof.formal_name,
        proof.joint_exhibit_num,
        proof.admitted_exhibit_num,
        proof.demonstrative_exhibit_num,
        getProofPartyText(proof, parties),
      ];

      return values.some((value) => normalizeSearchValue(value).includes(searchTerm));
    });
  }, [proofs, tab, searchQuery, parties]);
  const selectedProof = filtered.find((proof) => proof.id === selectedId) || filtered[0] || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle>Joint Proof Picker</DialogTitle>
          <DialogDescription className="text-slate-500">Choose a parent proof to add into the V2 exam order.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {['Exhibit', 'Deposition'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              {value === 'Exhibit' ? 'Exhibits' : 'Depositions'}
            </button>
          ))}
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search party, name, or exhibit #"
            className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 min-h-[28rem]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((proof) => (
                <button
                  key={proof.id}
                  type="button"
                  onClick={() => setSelectedId(proof.id)}
                  className={`rounded-xl border p-3 text-left ${selectedProof?.id === proof.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex justify-center">
                    <ProofThumbPreview proof={proof} size="lg" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-green-400">{getJointLabel(proof)}</span>
                    <span className="text-slate-500">{getProofTypeLabel(proof)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{getProofDisplayName(proof)}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col">
            {selectedProof ? (
              <>
                <div className="flex justify-center">
                  <ProofThumbPreview proof={selectedProof} size="lg" />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-semibold text-slate-900">{getProofDisplayName(selectedProof)}</p>
                  <p className="text-slate-600">Joint Exhibit #: <span className="text-green-600 font-semibold">{getJointLabel(selectedProof)}</span></p>
                  <p className="text-slate-600">Type: <span className="text-slate-900">{getProofTypeLabel(selectedProof)}</span></p>
                  <p className="text-slate-600">Status: <span className="text-slate-900">{selectedProof.status}</span></p>
                </div>
                <div className="mt-auto pt-4">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => { onSelect(selectedProof); onOpenChange(false); }}>
                    Add to Exam
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500">No proofs available.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}