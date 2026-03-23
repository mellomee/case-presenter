import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Search, X } from 'lucide-react';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import { getProofDisplayName, getProofTypeLabel, parseIdsField } from '@/lib/examV2Utils';

const SIDE_ORDER = ['Plaintiff', 'Defense', 'Neutral'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getPartyLabel(party) {
  return party ? `${party.first_name || ''} ${party.last_name || ''}`.trim() : '';
}

function compareParties(a, b) {
  const aLabel = getPartyLabel(a);
  const bLabel = getPartyLabel(b);
  return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
}

function getProofDepth(proof, proofsById) {
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

function formatProofType(proof) {
  const label = getProofTypeLabel(proof);
  return label === 'ExtractClip' ? 'Extract Clip' : label === 'VideoClip' ? 'Video Clip' : label;
}

function proofMatchesParty(proof, partyId) {
  if (partyId === 'all') return true;
  const attachedPartyIds = new Set([
    proof?.party_id,
    ...parseIdsField(proof?.party_ids),
  ].filter(Boolean));
  return attachedPartyIds.has(partyId);
}

function proofMatchesSearch(proof, searchValue, partiesById, proofsById) {
  if (!searchValue) return true;
  const parentProof = proof?.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
  return [
    proof?.name,
    proof?.formal_name,
    getProofDisplayName(proof),
    formatProofType(proof),
    partiesById[proof?.party_id]?.label,
    parentProof ? getProofDisplayName(parentProof) : '',
  ].some((value) => normalize(value).includes(searchValue));
}

export default function V2ProofReferenceBrowser({
  availableProofs = [],
  attachedProofIds = [],
  onToggleProof,
  onRemoveProof,
  onPreviewProof,
  previewProofId = null,
}) {
  const [activeTab, setActiveTab] = useState('Exhibit');
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');

  const proofsById = useMemo(() => Object.fromEntries(availableProofs.map((proof) => [proof.id, proof])), [availableProofs]);
  const partiesById = useMemo(() => {
    const partyMap = {};
    availableProofs.forEach((proof) => {
      if (proof.party_id && !partyMap[proof.party_id]) {
        partyMap[proof.party_id] = { label: '', side: null };
      }
    });
    return partyMap;
  }, [availableProofs]);

  const attachedProofs = useMemo(
    () => attachedProofIds.map((proofId) => proofsById[proofId]).filter(Boolean),
    [attachedProofIds, proofsById]
  );

  const groupedPartyOptions = useMemo(() => {
    const partyMap = new Map();
    availableProofs.forEach((proof) => {
      if (!proof.party_id || !proof.party) return;
      partyMap.set(proof.party_id, proof.party);
    });
    return SIDE_ORDER.map((side) => ({
      side,
      items: Array.from(partyMap.values()).filter((party) => party.side === side).sort(compareParties),
    })).filter((group) => group.items.length > 0);
  }, [availableProofs]);

  const enrichedPartiesById = useMemo(() => {
    const next = {};
    availableProofs.forEach((proof) => {
      if (proof.party?.id) {
        next[proof.party.id] = proof.party;
      }
    });
    return next;
  }, [availableProofs]);

  const groupedProofs = useMemo(() => {
    const tabProofs = availableProofs.filter((proof) => proof.proof_category === activeTab);
    const term = normalize(search);
    const groups = new Map();

    tabProofs.forEach((proof) => {
      const root = getRootProof(proof, proofsById);
      const existing = groups.get(root.id) || { root, items: [] };
      existing.items.push(proof);
      groups.set(root.id, existing);
    });

    return Array.from(groups.values())
      .map((group) => {
        const matchingItems = group.items.filter((proof) => proofMatchesParty(proof, partyFilter) && proofMatchesSearch(proof, term, enrichedPartiesById, proofsById));
        if (matchingItems.length === 0) return null;

        const visibleIds = new Set();
        matchingItems.forEach((proof) => {
          let current = proof;
          while (current) {
            visibleIds.add(current.id);
            current = current.parent_proof_id ? proofsById[current.parent_proof_id] : null;
          }
        });

        const visibleItems = group.items
          .filter((proof) => visibleIds.has(proof.id))
          .sort((a, b) => {
            const depthCompare = getProofDepth(a, proofsById) - getProofDepth(b, proofsById);
            if (depthCompare !== 0) return depthCompare;
            return getProofDisplayName(a).localeCompare(getProofDisplayName(b), undefined, { sensitivity: 'base' });
          });

        return { ...group, items: visibleItems };
      })
      .filter(Boolean)
      .sort((a, b) => getProofDisplayName(a.root).localeCompare(getProofDisplayName(b.root), undefined, { sensitivity: 'base' }));
  }, [activeTab, availableProofs, partyFilter, proofsById, search, enrichedPartiesById]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Inline proof references</p>
        {attachedProofIds.length > 0 && <p className="text-xs text-slate-400">Attach or remove proofs from this question here.</p>}
      </div>

      {attachedProofs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedProofs.map((proof) => (
            <button
              key={proof.id}
              type="button"
              onClick={() => onRemoveProof(proof.id)}
              className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200 hover:bg-blue-500/20"
              title="Remove attached proof"
            >
              <span className="max-w-[14rem] truncate">{getProofDisplayName(proof)}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="w-full justify-start bg-slate-900/70 lg:w-auto">
            <TabsTrigger value="Exhibit">Exhibit Proofs</TabsTrigger>
            <TabsTrigger value="Deposition">Deposition Proofs</TabsTrigger>
          </TabsList>

          <div className="flex flex-col gap-3 sm:flex-row lg:min-w-[28rem]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search internal name"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pl-9 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <select
              value={partyFilter}
              onChange={(event) => setPartyFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All Parties</option>
              {groupedPartyOptions.map((group, index) => (
                <React.Fragment key={group.side}>
                  {index > 0 ? <option disabled>──────────</option> : null}
                  <option disabled>{group.side}</option>
                  {group.items.map((party) => (
                    <option key={party.id} value={party.id}>{getPartyLabel(party)}</option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>
        </div>

        <TabsContent value="Exhibit" className="mt-0 space-y-3">
          {groupedProofs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
              No exhibit proofs match this filter.
            </div>
          ) : (
            groupedProofs.map((group) => (
              <div key={group.root.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                <div className="mb-3 border-b border-slate-800 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proof Family</p>
                  <p className="mt-1 text-sm font-semibold text-white">{getProofDisplayName(group.root)}</p>
                </div>
                <div className="space-y-3">
                  {group.items.map((proof) => {
                    const depth = getProofDepth(proof, proofsById);
                    const parentProof = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
                    const active = attachedProofIds.includes(proof.id);
                    const party = proof.party_id ? enrichedPartiesById[proof.party_id] : null;
                    return (
                      <div key={proof.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3" style={{ marginLeft: `${depth * 20}px` }}>
                        <div className="flex items-start gap-3">
                          <ExamBuilderProofThumb proof={proof} size={depth === 0 ? 'md' : 'sm'} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{getProofDisplayName(proof)}</p>
                                <p className="mt-1 text-xs text-slate-400">Internal: {proof.name || '—'}</p>
                                {parentProof && <p className="mt-1 text-xs text-slate-500">Child of {getProofDisplayName(parentProof)}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onPreviewProof(proof)}
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${previewProofId === proof.id ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700 bg-slate-950 text-slate-300 hover:text-white'}`}
                                  title="Preview proof"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <Button
                                  variant={active ? 'outline' : 'default'}
                                  className={active ? 'border-slate-600 text-slate-200' : 'bg-blue-600 hover:bg-blue-700'}
                                  onClick={() => onToggleProof(proof.id)}
                                >
                                  {active ? 'Attached' : 'Attach'}
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-200">{getHierarchyLabel(depth)}</span>
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-200">{formatProofType(proof)}</span>
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">{proof.status || 'Draft'}</span>
                              {party && <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">{getPartyLabel(party)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="Deposition" className="mt-0 space-y-3">
          {groupedProofs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
              No deposition proofs match this filter.
            </div>
          ) : (
            groupedProofs.map((group) => (
              <div key={group.root.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                <div className="mb-3 border-b border-slate-800 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proof Family</p>
                  <p className="mt-1 text-sm font-semibold text-white">{getProofDisplayName(group.root)}</p>
                </div>
                <div className="space-y-3">
                  {group.items.map((proof) => {
                    const depth = getProofDepth(proof, proofsById);
                    const parentProof = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
                    const active = attachedProofIds.includes(proof.id);
                    const party = proof.party_id ? enrichedPartiesById[proof.party_id] : null;
                    return (
                      <div key={proof.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3" style={{ marginLeft: `${depth * 20}px` }}>
                        <div className="flex items-start gap-3">
                          <ExamBuilderProofThumb proof={proof} size={depth === 0 ? 'md' : 'sm'} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{getProofDisplayName(proof)}</p>
                                <p className="mt-1 text-xs text-slate-400">Internal: {proof.name || '—'}</p>
                                {parentProof && <p className="mt-1 text-xs text-slate-500">Child of {getProofDisplayName(parentProof)}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onPreviewProof(proof)}
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${previewProofId === proof.id ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700 bg-slate-950 text-slate-300 hover:text-white'}`}
                                  title="Preview proof"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <Button
                                  variant={active ? 'outline' : 'default'}
                                  className={active ? 'border-slate-600 text-slate-200' : 'bg-blue-600 hover:bg-blue-700'}
                                  onClick={() => onToggleProof(proof.id)}
                                >
                                  {active ? 'Attached' : 'Attach'}
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-200">{getHierarchyLabel(depth)}</span>
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-200">{formatProofType(proof)}</span>
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">Deposition</span>
                              {party && <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">{getPartyLabel(party)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}