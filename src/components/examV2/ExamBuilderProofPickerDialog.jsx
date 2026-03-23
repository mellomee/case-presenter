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

function getDepth(proof, proofsById) {
  let depth = 0;
  let current = proof;
  while (current?.parent_proof_id && proofsById[current.parent_proof_id]) {
    depth += 1;
    current = proofsById[current.parent_proof_id];
  }
  return depth;
}

function getRootProof(proof, proofsById) {
  let current = proof;
  while (current?.parent_proof_id && proofsById[current.parent_proof_id]) {
    current = proofsById[current.parent_proof_id];
  }
  return current || proof;
}

function getHierarchyLabel(depth) {
  if (depth === 0) return 'Parent';
  if (depth === 1) return 'Child';
  return 'Grandchild';
}

function getStatusClass(status) {
  if (status === 'Admitted') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'Demonstrative') return 'border-purple-200 bg-purple-50 text-purple-700';
  if (status === 'Joint') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export default function ExamBuilderProofPickerDialog({ open, onOpenChange, proofs = [], allProofs = [], parties = [], onSelect }) {
  const [search, setSearch] = useState('');
  const [previewProof, setPreviewProof] = useState(null);

  const partiesById = useMemo(() => Object.fromEntries(parties.map((party) => [party.id, `${party.first_name} ${party.last_name}`.trim()])), [parties]);
  const proofsById = useMemo(() => Object.fromEntries(allProofs.map((proof) => [proof.id, proof])), [allProofs]);
  const selectableIds = useMemo(() => new Set(proofs.map((proof) => proof.id)), [proofs]);

  const matchesProof = (proof, term) => {
    const parentProof = proof?.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
    return [
      getProofDisplayName(proof),
      proof.name,
      proof.formal_name,
      proof.joint_exhibit_num,
      proof.admitted_exhibit_num,
      proof.demonstrative_exhibit_num,
      proof.proof_child_type,
      proof.file_type,
      partiesById[proof.party_id],
      parentProof ? getProofDisplayName(parentProof) : '',
    ].some((value) => normalize(value).includes(term));
  };

  const groupedProofs = useMemo(() => {
    const term = normalize(search);
    const groups = new Map();

    proofs.forEach((proof) => {
      const rootProof = getRootProof(proof, proofsById);
      const existing = groups.get(rootProof.id) || { root: rootProof, items: [] };
      existing.items.push(proof);
      groups.set(rootProof.id, existing);
    });

    return Array.from(groups.values())
      .map((group) => {
        const rootMatches = matchesProof(group.root, term);
        const matchingItems = term ? group.items.filter((item) => matchesProof(item, term)) : group.items;
        if (term && !rootMatches && matchingItems.length === 0) return null;

        const visibleItems = Array.from(
          new Map([
            ...((rootMatches || matchingItems.length > 0) ? [group.root] : []),
            ...matchingItems,
          ].map((item) => [item.id, item])).values()
        ).sort((a, b) => {
          const depthComparison = getDepth(a, proofsById) - getDepth(b, proofsById);
          if (depthComparison !== 0) return depthComparison;
          return getProofDisplayName(a).localeCompare(getProofDisplayName(b), undefined, { sensitivity: 'base' });
        });

        return { root: group.root, items: visibleItems };
      })
      .filter(Boolean)
      .sort((a, b) => getProofDisplayName(a.root).localeCompare(getProofDisplayName(b.root), undefined, { sensitivity: 'base' }));
  }, [proofs, proofsById, search, partiesById]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl border-slate-200 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Add Joint Proof</DialogTitle>
            <DialogDescription className="text-slate-500">Pick a parent proof or one of its children to add to the Exam Builder V2 order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search proofs, exhibit numbers, or parent proofs"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-300"
              />
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              {groupedProofs.map((group) => (
                <div key={group.root.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proof Family</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{getProofDisplayName(group.root)}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((proof) => {
                      const depth = getDepth(proof, proofsById);
                      const parentProof = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
                      const isSelectable = selectableIds.has(proof.id);

                      return (
                        <div
                          key={proof.id}
                          className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${depth > 0 ? 'ml-6' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <ExamBuilderProofThumb proof={proof} size={depth === 0 ? 'md' : 'sm'} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
                                  {parentProof && <p className="mt-1 text-xs text-slate-500">Child of {getProofDisplayName(parentProof)}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewProof(proof)}
                                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
                                    title="Preview proof"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <Button
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={!isSelectable}
                                    onClick={async () => {
                                      await onSelect(proof);
                                      onOpenChange(false);
                                    }}
                                  >
                                    Add to Exam
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">{getHierarchyLabel(depth)}</span>
                                {proof.status && <span className={`rounded-full border px-2 py-0.5 ${getStatusClass(proof.status)}`}>{proof.status}</span>}
                                {proof.joint_exhibit_num && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">Joint # {proof.joint_exhibit_num}</span>}
                                {proof.admitted_exhibit_num && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-green-700">Admitted # {proof.admitted_exhibit_num}</span>}
                                {proof.demonstrative_exhibit_num && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-700">Demo # {proof.demonstrative_exhibit_num}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {groupedProofs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No proofs match your search.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ExamBuilderSafePreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={allProofs} />
    </>
  );
}