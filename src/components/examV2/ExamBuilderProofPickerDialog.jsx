import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Search } from 'lucide-react';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import ExamBuilderSafePreviewDialog from '@/components/examV2/ExamBuilderSafePreviewDialog.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export default function ExamBuilderProofPickerDialog({ open, onOpenChange, proofs = [], parties = [], onSelect }) {
  const [search, setSearch] = useState('');
  const [previewProof, setPreviewProof] = useState(null);

  const partiesById = useMemo(() => Object.fromEntries(parties.map((party) => [party.id, `${party.first_name} ${party.last_name}`.trim()])), [parties]);

  const filteredProofs = useMemo(() => {
    const term = normalize(search);
    return proofs
      .filter((proof) => {
        if (!term) return true;
        return [
          getProofDisplayName(proof),
          proof.name,
          proof.formal_name,
          proof.joint_exhibit_num,
          proof.admitted_exhibit_num,
          proof.demonstrative_exhibit_num,
          partiesById[proof.party_id],
        ].some((value) => normalize(value).includes(term));
      })
      .sort((a, b) => getProofDisplayName(a).localeCompare(getProofDisplayName(b), undefined, { sensitivity: 'base' }));
  }, [partiesById, proofs, search]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl border-slate-200 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Add Joint Proof</DialogTitle>
            <DialogDescription className="text-slate-500">Pick a proof to add to the Exam Builder V2 order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search proofs"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-300"
              />
            </div>
            <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredProofs.map((proof) => (
                <div key={proof.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <ExamBuilderProofThumb proof={proof} size="md" />
                    <button
                      type="button"
                      onClick={() => setPreviewProof(proof)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
                      title="Preview proof"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {proof.status && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">{proof.status}</span>}
                      {proof.joint_exhibit_num && <span>Joint # {proof.joint_exhibit_num}</span>}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={async () => {
                        await onSelect(proof);
                        onOpenChange(false);
                      }}
                    >
                      Add to Exam
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ExamBuilderSafePreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={proofs} />
    </>
  );
}