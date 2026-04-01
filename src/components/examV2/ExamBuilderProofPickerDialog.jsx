import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Search } from 'lucide-react';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import ExamBuilderSafePreviewDialog from '@/components/examV2/ExamBuilderSafePreviewDialog.jsx';
import { getProofDisplayName, getTopLevelAncestorId } from '@/lib/examV2Utils';

const PARTY_SIDE_ORDER = ['Plaintiff', 'Defense', 'Neutral'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function comparePartiesByFirstName(a, b) {
  const firstComparison = String(a?.first_name || '').localeCompare(String(b?.first_name || ''), undefined, { sensitivity: 'base' });
  if (firstComparison !== 0) return firstComparison;
  return String(a?.last_name || '').localeCompare(String(b?.last_name || ''), undefined, { sensitivity: 'base' });
}

function renderGroupedPartyOptions(parties = [], { allLabel = null } = {}) {
  const groups = PARTY_SIDE_ORDER
    .map((side) => ({
      side,
      items: [...parties].filter((party) => party.side === side).sort(comparePartiesByFirstName),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {allLabel ? <option value="all">{allLabel}</option> : null}
      {groups.flatMap((group, index) => [
        ...(index > 0 ? [<option key={`${group.side}-separator`} disabled>──────────</option>] : []),
        <option key={`${group.side}-label`} disabled>{group.side}</option>,
        ...group.items.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>),
      ])}
    </>
  );
}

function getProofPartyIds(proof) {
  const partyIds = Array.isArray(proof?.party_ids)
    ? proof.party_ids
    : Array.isArray(proof?.party_ids?.ids)
      ? proof.party_ids.ids
      : [];

  return [...new Set([proof?.party_id, ...partyIds].filter(Boolean))];
}

function getProofTypeLabel(proof) {
  if (proof.proof_child_type === 'ExtractClip') return 'Extract Clip';
  if (proof.proof_child_type === 'VideoClip') return 'Video Clip';
  if (proof.proof_child_type === 'Extract') return 'Extract';
  if (proof.file_type === 'Video') return 'Video';
  if (proof.file_type === 'Image') return 'Image';
  return 'PDF';
}

export default function ExamBuilderProofPickerDialog({ open, onOpenChange, proofs = [], parties = [], onSelect }) {
  const [proofTab, setProofTab] = useState('Exhibit');
  const [searchQuery, setSearchQuery] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');
  const [previewProof, setPreviewProof] = useState(null);

  useEffect(() => {
    if (!open) return;
    setProofTab('Exhibit');
    setSearchQuery('');
    setPartyFilter('all');
    setPreviewProof(null);
  }, [open]);

  const proofById = useMemo(
    () => Object.fromEntries(proofs.map((proof) => [proof.id, proof])),
    [proofs]
  );

  const visibleProofTree = useMemo(() => {
    const getRootProof = (proof) => {
      let currentProof = proof;
      while (currentProof?.parent_proof_id && proofById[currentProof.parent_proof_id]) {
        currentProof = proofById[currentProof.parent_proof_id];
      }
      return currentProof;
    };

    const matchingProofs = proofs.filter((proof) => {
      const rootProof = getRootProof(proof);

      if (proofTab === 'Exhibit') {
        const belongsToExhibitTree = rootProof?.proof_category === 'Exhibit';
        const isEligibleExhibit = ['Joint', 'Admitted', 'Demonstrative'].includes(rootProof?.status) || ['ExtractClip', 'VideoClip'].includes(proof.proof_child_type);
        if (!belongsToExhibitTree || !isEligibleExhibit) {
          return false;
        }
      } else {
        const belongsToDepositionTree = rootProof?.proof_category === 'Deposition';
        if (!belongsToDepositionTree) {
          return false;
        }
      }

      if (partyFilter !== 'all' && !getProofPartyIds(proof).includes(partyFilter)) {
        return false;
      }

      const searchTerm = normalize(searchQuery);
      if (!searchTerm) return true;

      const searchValues = [
        proof.name,
        proof.formal_name,
        proof.joint_exhibit_num,
        proof.admitted_exhibit_num,
        proof.demonstrative_exhibit_num,
        getProofTypeLabel(proof),
        ...getProofPartyIds(proof).map((partyId) => {
          const party = parties.find((item) => item.id === partyId);
          return party ? `${party.first_name} ${party.last_name}` : '';
        }),
      ];

      return searchValues.some((value) => normalize(value).includes(searchTerm));
    });

    const visibleIds = new Set();
    matchingProofs.forEach((proof) => {
      let currentProof = proof;
      while (currentProof) {
        visibleIds.add(currentProof.id);
        currentProof = currentProof.parent_proof_id ? proofById[currentProof.parent_proof_id] : null;
      }
    });

    const roots = proofs.filter((proof) => visibleIds.has(proof.id) && getTopLevelAncestorId(proof, proofById) === proof.id);
    const childrenByParent = new Map();

    proofs.forEach((proof) => {
      if (!visibleIds.has(proof.id) || !proof.parent_proof_id) return;
      const parentId = visibleIds.has(proof.parent_proof_id)
        ? proof.parent_proof_id
        : getTopLevelAncestorId(proof, proofById);
      if (!parentId || parentId === proof.id) return;
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId).push(proof);
    });

    childrenByParent.forEach((items) => {
      items.sort((a, b) => String(getProofDisplayName(a)).localeCompare(String(getProofDisplayName(b)), undefined, { sensitivity: 'base' }));
    });

    roots.sort((a, b) => String(getProofDisplayName(a)).localeCompare(String(getProofDisplayName(b)), undefined, { sensitivity: 'base' }));

    return { roots, childrenByParent };
  }, [parties, partyFilter, proofById, proofTab, proofs, searchQuery]);

  const renderProofRow = (proof, depth = 0) => {
    const children = visibleProofTree.childrenByParent.get(proof.id) || [];
    const partyNames = getProofPartyIds(proof)
      .map((partyId) => parties.find((party) => party.id === partyId))
      .filter(Boolean)
      .map((party) => `${party.first_name} ${party.last_name}`);

    return (
      <div key={proof.id} className="space-y-2" style={{ marginLeft: `${depth * 18}px` }}>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <ExamBuilderProofThumb proof={proof} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">{getProofTypeLabel(proof)}</span>
                {proof.proof_category === 'Exhibit' && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">{proof.status}</span>}
              </div>
              {partyNames.length > 0 && <p className="mt-1 text-[11px] text-slate-500">{partyNames.join(' · ')}</p>}
              {proof.parent_proof_id && proofById[proof.parent_proof_id] && (
                <p className="mt-1 text-[11px] text-slate-400">Child of {getProofDisplayName(proofById[proof.parent_proof_id])}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                {proof.joint_exhibit_num && <span>Joint # {proof.joint_exhibit_num}</span>}
                {proof.admitted_exhibit_num && <span>Admitted # {proof.admitted_exhibit_num}</span>}
                {proof.demonstrative_exhibit_num && <span>Demo # {proof.demonstrative_exhibit_num}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewProof(proof)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
                title="Preview proof"
              >
                <Eye className="h-4 w-4" />
              </button>
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
        </div>
        {children.map((child) => renderProofRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl border-slate-200 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Add Joint Proof</DialogTitle>
            <DialogDescription className="text-slate-500">Pick a parent or child proof to add to the Exam Builder V2 order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {['Exhibit', 'Deposition'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProofTab(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${proofTab === value ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {value}s
                </button>
              ))}
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search internal name, type, exhibit #, or party"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                />
              </div>
              <select
                value={partyFilter}
                onChange={(event) => setPartyFilter(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300"
              >
                {renderGroupedPartyOptions(parties, { allLabel: 'All Parties' })}
              </select>
            </div>

            <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
              {visibleProofTree.roots.length > 0 ? visibleProofTree.roots.map((proof) => renderProofRow(proof)) : (
                <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No proofs match this view.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ExamBuilderSafePreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={proofs} />
    </>
  );
}