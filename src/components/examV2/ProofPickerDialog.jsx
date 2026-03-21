import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import InlineProofPreviewDialog from '@/components/examV2/InlineProofPreviewDialog.jsx';
import ProofPickerProofCard from '@/components/examV2/ProofPickerProofCard.jsx';
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
  const [previewProof, setPreviewProof] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTab('Exhibit');
    setSelectedId('');
    setSearchQuery('');
    setPreviewProof(null);
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

  const parentProofs = useMemo(
    () => filtered.filter((proof) => !proof.parent_proof_id),
    [filtered]
  );

  const selectedProof = parentProofs.find((proof) => proof.id === selectedId) || parentProofs[0] || null;

  const childProofs = useMemo(
    () => selectedProof ? filtered.filter((proof) => proof.parent_proof_id === selectedProof.id) : [],
    [filtered, selectedProof]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900">
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
        <div className="grid grid-cols-1 gap-4 min-h-0 lg:min-h-[28rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,0.9fr)]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-y-auto max-h-[60vh] lg:max-h-[68vh]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Parent joint proofs</p>
              <span className="text-xs text-slate-500">{parentProofs.length}</span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {parentProofs.map((proof) => (
                <ProofPickerProofCard
                  key={proof.id}
                  proof={proof}
                  isSelected={selectedProof?.id === proof.id}
                  onSelect={() => setSelectedId(proof.id)}
                  onPreview={setPreviewProof}
                />
              ))}
            </div>
            {parentProofs.length === 0 && (
              <div className="flex min-h-[12rem] items-center justify-center text-sm text-slate-500">No parent proofs available.</div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-y-auto max-h-[60vh] lg:max-h-[68vh]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Child proofs</p>
              <span className="text-xs text-slate-500">{childProofs.length}</span>
            </div>
            {selectedProof ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {childProofs.map((proof) => (
                  <ProofPickerProofCard
                    key={proof.id}
                    proof={proof}
                    onPreview={setPreviewProof}
                  />
                ))}
              </div>
            ) : null}
            {!selectedProof ? (
              <div className="flex min-h-[12rem] items-center justify-center text-sm text-slate-500">Select a parent proof to see its child proofs.</div>
            ) : childProofs.length === 0 ? (
              <div className="flex min-h-[12rem] items-center justify-center text-sm text-slate-500">This proof has no child proofs.</div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col overflow-y-auto max-h-[60vh] lg:max-h-[68vh]">
            {selectedProof ? (
              <>
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected parent proof</p>
                  <p className="font-semibold text-slate-900">{getProofDisplayName(selectedProof)}</p>
                  <p className="text-slate-600">Joint Exhibit #: <span className="text-green-600 font-semibold">{getJointLabel(selectedProof)}</span></p>
                  <p className="text-slate-600">Type: <span className="text-slate-900">{getProofTypeLabel(selectedProof)}</span></p>
                  <p className="text-slate-600">Status: <span className="text-slate-900">{selectedProof.status}</span></p>
                  <p className="text-slate-600">Child proofs: <span className="text-slate-900">{childProofs.length}</span></p>
                </div>
                <div className="mt-auto pt-4">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => { onSelect(selectedProof); onOpenChange(false); }}>
                    Add Parent Proof to Exam
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500">No proofs available.</div>
            )}
          </div>
        </div>
        <InlineProofPreviewDialog
          open={!!previewProof}
          onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)}
          proof={previewProof}
          allProofs={proofs}
        />
      </DialogContent>
    </Dialog>
  );
}