import React from 'react';

export default function HubToolbar({
  sideOptions = [],
  selectedSide,
  onSideChange,
  witnessOptions = [],
  selectedPartyId,
  onPartyChange,
  selectedExamType,
  onExamTypeChange,
  searchQuery,
  onSearchChange,
  searchResults = [],
  onSearchSelect,
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedSide} onChange={(event) => onSideChange(event.target.value)} className="h-10 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700">
            {sideOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>

          <select value={selectedPartyId} onChange={(event) => onPartyChange(event.target.value)} className="h-10 min-w-[220px] rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700">
            {witnessOptions.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
          </select>

          <div className="inline-flex rounded-full border border-slate-300 bg-slate-50 p-1 text-sm">
            {['Direct', 'Cross'].map((value) => (
              <button
                key={value}
                onClick={() => onExamTypeChange(value)}
                className={`rounded-full px-4 py-1.5 font-semibold transition ${selectedExamType === value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-white'}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-xl">
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search buckets, groups, questions, proofs..."
            className="h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm"
          />
          {searchQuery && searchResults.length > 0 && (
            <div className="absolute top-12 z-30 w-full rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => onSearchSelect(result)}
                  className="flex w-full items-start justify-between rounded-2xl px-3 py-2 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{result.label}</p>
                    <p className="truncate text-xs text-slate-500">{result.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}