import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import ExamBuilderProofFamilyCard from '@/components/examV2/ExamBuilderProofFamilyCard.jsx';
import ExamBuilderSafePreviewDialog from '@/components/examV2/ExamBuilderSafePreviewDialog.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { getProofRoot, isProofSelectableForExamBuilder } from '@/lib/proofStatusUtils';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export default function ExamBuilderProofPickerDialog({ open, onOpenChange, proofs = [], parties = [], onSelect }) {
  const [search, setSearch] = useState('');
  const [previewProof, setPreviewProof] = useState(null);

  const partiesById = useMemo(() => Object.fromEntries(parties.map((party) => [party.id, `${party.first_name} ${party.last_name}`.trim()])), [parties]);
  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);

  const proofFamilies = useMemo(() => {
    const eligibleProofs = proofs.filter((proof) => isProofSelectableForExamBuilder(proof, proofsById));
    const familyMap = new Map();

    eligibleProofs.forEach((proof) => {
      const rootProof = getProofRoot(proof, proofsById) || proof;
      const rootId = rootProof.id || proof.id;

      if (!familyMap.has(rootId)) {
        familyMap.set(rootId, new Map());
      }

      familyMap.get(rootId).set(rootProof.id, rootProof);
      familyMap.get(rootId).set(proof.id, proof);
    });

    const term = normalize(search);

    return Array.from(familyMap.values())
      .map((familyEntries) => {
        const familyProofs = Array.from(familyEntries.values());
        const rootProof = familyProofs.find((proof) => !proof.parent_proof_id || !proofsById[proof.parent_proof_id]) || familyProofs[0];
        const sortedFamilyProofs = [
          rootProof,
          ...familyProofs
            .filter((proof) => proof.id !== rootProof.id)
            .sort((a, b) => getProofDisplayName(a).localeCompare(getProofDisplayName(b), undefined, { sensitivity: 'base' })),
        ];

        const matchesSearch = !term || sortedFamilyProofs.some((proof) => [
          getProofDisplayName(proof),
          proof.name,
          proof.formal_name,
          proof.joint_exhibit_num,
          proof.admitted_exhibit_num,
          proof.demonstrative_exhibit_num,
          partiesById[proof.party_id],
        ].some((value) => normalize(value).includes(term)));

        return { rootProof, familyProofs: sortedFamilyProofs, matchesSearch };
      })
      .filter((family) => family.matchesSearch)
      .sort((a, b) => getProofDisplayName(a.rootProof).localeCompare(getProofDisplayName(b.rootProof), undefined, { sensitivity: 'base' }));
  }, [partiesById, proofs, proofsById, search]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl border-slate-200 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Add Joint Proof</DialogTitle>
            <DialogDescription className="text-slate-500">Pick a parent proof or one of its children to add it to the Exam Builder V2 order.</DialogDescription>
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
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              {proofFamilies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No proofs match your search.
                </div>
              ) : proofFamilies.map((family) => (
                <ExamBuilderProofFamilyCard
                  key={family.rootProof.id}
                  rootProof={family.rootProof}
                  familyProofs={family.familyProofs}
                  proofsById={proofsById}
                  onPreview={setPreviewProof}
                  onSelect={async (proof) => {
                    await onSelect(proof);
                    onOpenChange(false);
                  }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ExamBuilderSafePreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={proofs} />
    </>
  );
}