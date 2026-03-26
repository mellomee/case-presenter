import React from 'react';
import { Search, X } from 'lucide-react';
import AttorneyCentralProofTile from '@/components/attorneyCentral/AttorneyCentralProofTile.jsx';
import { getProofDisplayLabel } from '@/lib/attorneyCentralUtils';

export default function AttorneyCentralRightDrawer({ open, onClose, libraryTab, onLibraryTabChange, statusFilter, onStatusFilterChange, search, onSearchChange, lanes = [], selectedProofId, onSelectProof, linkedQuestionMap = {} }) {
  const statusOptions = ['all', 'joint', 'admitted', 'demonstrative'];

  return (
    <aside className={`fixed inset-y-0 right-0 z-30 w-[min(34rem,94vw)] border-l border-slate-200 bg-slate-50 shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof Library</p>
              <h2 className="text-lg font-bold text-slate-900">Marked Exhibits & Depositions</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
            {[
              { key: 'exhibits', label: 'Marked Exhibits' },
              { key: 'depositions', label: 'Depositions' },
            ].map((tab) => (
              <button key={tab.key} type="button" onClick={() => onLibraryTabChange(tab.key)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${libraryTab === tab.key ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {libraryTab === 'exhibits' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button key={option} type="button" onClick={() => onStatusFilterChange(option)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusFilter === option ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                  {option === 'all' ? 'All' : option[0].toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search proofs" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-28">
          {lanes.length > 0 ? lanes.map((lane) => (
            <div key={lane.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof Family</p>
                <h3 className="text-base font-bold text-slate-900">{getProofDisplayLabel(lane.parent)}</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {lane.items.map((proof, index) => (
                  <React.Fragment key={proof.id}>
                    {index > 0 && <div className="flex shrink-0 items-center text-slate-300">→</div>}
                    <AttorneyCentralProofTile
                      proof={proof}
                      selected={selectedProofId === proof.id}
                      questionLabels={linkedQuestionMap[proof.id] || []}
                      onSelect={() => {
                        onSelectProof(proof.id);
                        onClose();
                      }}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No proofs match this view yet.</div>
          )}
        </div>
      </div>
    </aside>
  );
}