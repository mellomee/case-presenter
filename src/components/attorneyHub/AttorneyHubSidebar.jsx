import React from 'react';

function toneClasses(tone) {
  if (tone === 'blue') return 'bg-blue-100 text-blue-700';
  if (tone === 'green') return 'bg-emerald-100 text-emerald-700';
  if (tone === 'amber') return 'bg-amber-100 text-amber-700';
  if (tone === 'red') return 'bg-rose-100 text-rose-700';
  if (tone === 'teal') return 'bg-cyan-100 text-cyan-700';
  return 'bg-slate-100 text-slate-600';
}

export default function AttorneyHubSidebar({ sidebarGroups = [], selectedNodeId, onFocusNode, bucketMetaById = {} }) {
  return (
    <div className="h-full w-[280px] flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Navigator</p>
        <p className="mt-1 text-sm text-slate-600">Jump by branch, bucket, or proof need.</p>
      </div>

      <div className="space-y-3 p-3">
        {sidebarGroups.map((group) => (
          <details key={group.trialPoint.id} open className="rounded-3xl border border-slate-200 bg-slate-50/70">
            <summary className="cursor-pointer list-none px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{group.trialPoint.name}</p>
                  <p className="text-xs text-slate-500">{group.buckets.length} bucket{group.buckets.length === 1 ? '' : 's'}</p>
                </div>
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    onFocusNode(`trialpoint-${group.trialPoint.id}`);
                  }}
                  className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
                >
                  Center
                </button>
              </div>
            </summary>

            <div className="space-y-2 px-3 pb-3">
              {group.buckets.map((bucket) => {
                const meta = bucketMetaById[bucket.id] || {};
                const active = selectedNodeId === `bucket-${bucket.id}`;
                return (
                  <button
                    key={bucket.id}
                    onClick={() => onFocusNode(`bucket-${bucket.id}`)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{bucket.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{meta.questionCount || 0} questions · {meta.proofCount || 0} proofs</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClasses(meta.statusTone)}`}>{meta.statusLabel || 'Not Started'}</span>
                        {meta.hasProof ? <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">Has Proof</span> : null}
                        {meta.needsAdmission ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Needs Admission</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}