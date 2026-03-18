import React from 'react';

export default function WorkspaceToolbar({
  sideOptions = [],
  selectedSide,
  onSideChange,
  witnessOptions = [],
  selectedPartyId,
  onPartyChange,
  selectedExamType,
  onExamTypeChange,
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedSide} onChange={(event) => onSideChange(event.target.value)} className="h-10 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700">
            {sideOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select value={selectedPartyId} onChange={(event) => onPartyChange(event.target.value)} className="h-10 min-w-[220px] rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700">
            {witnessOptions.map((party) => (
              <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>
            ))}
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
        <div>
          <p className="text-sm font-semibold text-slate-900">Workspace</p>
          <p className="text-xs text-slate-500">Build question groups, attach proofs, and place admission blocks.</p>
        </div>
      </div>
    </div>
  );
}