import React from 'react';
import { Search } from 'lucide-react';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { countQuestionLinks, getProofHistoryChips, getProofKindLabel, getProofMetaLine, getProofNumber, getProofStatusConfig, normalizeSearchValue } from '@/lib/attorneyCentralUtils';

function getPrimaryName(proof) {
  return proof?.name || proof?.formal_name || getProofDisplayName(proof);
}

function matchesProofSearch(proof, searchTerm) {
  const normalizedSearch = normalizeSearchValue(searchTerm);
  if (!normalizedSearch) return true;
  return [proof?.name, proof?.formal_name, proof?.joint_exhibit_num, proof?.admitted_exhibit_num, proof?.demonstrative_exhibit_num]
    .some((value) => normalizeSearchValue(value).includes(normalizedSearch));
}

function ProofNode({ proof, depth = 0, childrenMap, selectedProofId, onSelectProof, highlightedProofId, examItems, localDecisionMap }) {
  const children = (childrenMap[proof.id] || []).slice().sort((a, b) => getPrimaryName(a).localeCompare(getPrimaryName(b), undefined, { sensitivity: 'base' }));
  const isSelected = selectedProofId === proof.id;
  const isHighlighted = highlightedProofId === proof.id;
  const status = getProofStatusConfig(proof, proof.status === 'Joint' ? localDecisionMap[proof.id] : null);
  const linkCount = countQuestionLinks(proof.id, examItems);

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-stone-200 pl-4' : ''}`}>
      <button
        type="button"
        onClick={() => onSelectProof(proof.id)}
        className={`w-full rounded-3xl border p-4 text-left transition ${isSelected ? 'border-stone-900 bg-stone-900 text-white shadow-lg' : 'border-stone-200 bg-white text-stone-900 shadow-sm hover:border-stone-300 hover:shadow-md'} ${isHighlighted ? 'ring-2 ring-amber-300' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-black tracking-[0.18em] ${isSelected ? 'border-white/20 bg-white/10 text-white' : status.accent}`}>
            {getProofNumber(proof)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white' : status.pill}`}>
            {status.label}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white/90' : 'border-stone-200 bg-stone-50 text-stone-600'}`}>
            {getProofKindLabel(proof)}
          </span>
          {linkCount > 0 ? (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white/90' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
              {linkCount} linked question{linkCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-stone-900'}`}>{getPrimaryName(proof)}</p>
          {proof.formal_name && proof.name ? <p className={`mt-1 text-xs ${isSelected ? 'text-white/70' : 'text-stone-500'}`}>Display: {proof.formal_name}</p> : null}
          {getProofMetaLine(proof) ? <p className={`mt-1 text-xs ${isSelected ? 'text-white/70' : 'text-stone-500'}`}>{getProofMetaLine(proof)}</p> : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {getProofHistoryChips(proof).map((chip) => (
            <span key={chip.key} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white/90' : chip.className}`}>
              {chip.label}: {chip.value}
            </span>
          ))}
        </div>
      </button>

      {children.length > 0 ? (
        <div className="mt-3 space-y-3">
          {children.map((child) => (
            <ProofNode
              key={child.id}
              proof={child}
              depth={depth + 1}
              childrenMap={childrenMap}
              selectedProofId={selectedProofId}
              onSelectProof={onSelectProof}
              highlightedProofId={highlightedProofId}
              examItems={examItems}
              localDecisionMap={localDecisionMap}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DepositionTile({ proof, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[12rem] rounded-3xl border px-4 py-3 text-left transition ${isActive ? 'border-stone-900 bg-stone-900 text-white shadow-lg' : 'border-stone-200 bg-white text-stone-900 shadow-sm hover:border-stone-300 hover:shadow-md'}`}
    >
      <p className="text-sm font-bold">{getPrimaryName(proof)}</p>
      <p className={`mt-1 text-xs ${isActive ? 'text-white/70' : 'text-stone-500'}`}>{getProofKindLabel(proof)}</p>
    </button>
  );
}

export default function AttorneyCentralMarkedDrawer({
  title,
  open,
  mode,
  proofs = [],
  childrenMap = {},
  selectedProofId,
  onSelectProof,
  highlightedProofId,
  examItems = [],
  localDecisionMap = {},
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  parties = [],
  selectedDepositionPartyId = 'all',
  onSelectDepositionPartyId,
  selectedDepositionParentId,
  onSelectDepositionParentId,
}) {
  const visibleProofs = proofs
    .filter((proof) => {
      const searchMatch = matchesProofSearch(proof, search);
      if (!searchMatch) return false;
      if (mode !== 'marked' || statusFilter === 'all') return true;
      if (statusFilter === 'joint') return proof.status === 'Joint';
      if (statusFilter === 'admitted') return proof.status === 'Admitted';
      if (statusFilter === 'demonstrative') return proof.status === 'Demonstrative';
      return true;
    })
    .slice()
    .sort((a, b) => getPrimaryName(a).localeCompare(getPrimaryName(b), undefined, { sensitivity: 'base' }));

  const depositionParents = proofs
    .filter((proof) => selectedDepositionPartyId === 'all' || proof.party_id === selectedDepositionPartyId)
    .filter((proof) => {
      if (matchesProofSearch(proof, search)) return true;
      return (childrenMap[proof.id] || []).some((child) => matchesProofSearch(child, search));
    })
    .slice()
    .sort((a, b) => getPrimaryName(a).localeCompare(getPrimaryName(b), undefined, { sensitivity: 'base' }));

  const activeDepositionParent = depositionParents.find((proof) => proof.id === selectedDepositionParentId) || depositionParents[0] || null;
  const visibleDepositionChildren = activeDepositionParent
    ? (childrenMap[activeDepositionParent.id] || [])
        .filter((proof) => matchesProofSearch(proof, search) || !normalizeSearchValue(search))
        .slice()
        .sort((a, b) => getPrimaryName(a).localeCompare(getPrimaryName(b), undefined, { sensitivity: 'base' }))
    : [];

  return (
    <aside className={`absolute bottom-0 left-0 top-0 z-20 w-[min(28rem,calc(100vw-3rem))] border-r border-stone-200 bg-[#fbf7f1] shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col">
        <div className="border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Attorney Central</p>
            <h2 className="mt-1 text-xl font-bold text-stone-900">{title}</h2>
          </div>

          {mode === 'depositions' ? (
            <select value={selectedDepositionPartyId} onChange={(event) => onSelectDepositionPartyId?.(event.target.value)} className="mt-4 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none">
              <option value="all">All parties</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>
              ))}
            </select>
          ) : null}

          <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-stone-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={mode === 'marked' ? 'Search exhibit # or title' : 'Search deposition'}
                className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              />
            </div>
          </div>

          {mode === 'marked' ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'joint', label: 'Marked' },
                { value: 'admitted', label: 'Admitted' },
                { value: 'demonstrative', label: 'Demo' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onStatusFilterChange(item.value)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold ${statusFilter === item.value ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {mode === 'marked' ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {visibleProofs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-8 text-center text-sm text-stone-500">
                Nothing matches your current filter.
              </div>
            ) : (
              visibleProofs.map((proof) => (
                <ProofNode
                  key={proof.id}
                  proof={proof}
                  childrenMap={childrenMap}
                  selectedProofId={selectedProofId}
                  onSelectProof={(proofId) => onSelectProof(proofId, { keepDrawerOpen: false })}
                  highlightedProofId={highlightedProofId}
                  examItems={examItems}
                  localDecisionMap={localDecisionMap}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-4 py-4">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {depositionParents.map((proof) => (
                  <DepositionTile
                    key={proof.id}
                    proof={proof}
                    isActive={activeDepositionParent?.id === proof.id}
                    onClick={() => {
                      onSelectDepositionParentId?.(proof.id);
                      onSelectProof(proof.id, { keepDrawerOpen: true });
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mx-4 h-px bg-stone-200" />

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {!activeDepositionParent ? (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-8 text-center text-sm text-stone-500">
                  Pick a deposition to see its clips and extracts.
                </div>
              ) : visibleDepositionChildren.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-8 text-center text-sm text-stone-500">
                  No child proofs match this deposition.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleDepositionChildren.map((proof) => (
                    <ProofNode
                      key={proof.id}
                      proof={proof}
                      depth={0}
                      childrenMap={childrenMap}
                      selectedProofId={selectedProofId}
                      onSelectProof={(proofId) => onSelectProof(proofId, { keepDrawerOpen: false })}
                      highlightedProofId={highlightedProofId}
                      examItems={examItems}
                      localDecisionMap={localDecisionMap}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}