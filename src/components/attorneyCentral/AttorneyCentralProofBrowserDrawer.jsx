import React from 'react';
import AttorneyCentralProofPill from './AttorneyCentralProofPill.jsx';
import { Search, X } from 'lucide-react';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function AttorneyCentralProofBrowserDrawer({
  open,
  title,
  sections = [],
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedProofId,
  onSelectProof,
  onClose,
}) {
  return (
    <div className={`absolute inset-y-3 left-3 z-30 w-[min(24rem,calc(100vw-2.5rem))] rounded-[28px] border border-white/20 bg-slate-950/78 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-[120%]'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 text-white">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Browser</div>
            <div className="mt-1 text-xl font-bold">{title}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 bg-white/10 p-2 text-slate-200 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-white/10 px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by exhibit # or name"
              className="h-11 w-full rounded-2xl border border-white/15 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-white/30 focus:outline-none"
            />
          </div>

          {onStatusFilterChange ? (
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'joint', label: 'Marked' },
                { value: 'admitted', label: 'Admitted' },
                { value: 'demonstrative', label: 'Demo' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onStatusFilterChange(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusFilter === option.value ? 'border-blue-400 bg-blue-500/20 text-blue-100' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">No proofs match this view yet.</div>
          ) : (
            sections.map((section) => {
              const isSelected = selectedProofId === section.root.id;
              return (
                <div key={section.root.id} className={`rounded-[24px] border p-3 ${isSelected ? 'border-blue-300/60 bg-blue-400/10' : 'border-white/10 bg-white/5'}`}>
                  <AttorneyCentralProofPill
                    proof={section.root}
                    onClick={() => onSelectProof(section.root.id)}
                  />

                  {section.children.length > 0 ? (
                    <div className="mt-3 space-y-2 border-l border-white/10 pl-3">
                      {section.children.map((child) => (
                        <AttorneyCentralProofPill
                          key={child.id}
                          proof={child}
                          compact
                          relationLabel={`Child of ${getProofDisplayName(section.root)}`}
                          onClick={() => onSelectProof(child.id)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}