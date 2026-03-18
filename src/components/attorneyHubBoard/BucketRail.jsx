import React from 'react';

function toneClass(status) {
  if (status === 'Done') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Active') return 'bg-blue-100 text-blue-700';
  if (status === 'Skipped') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

export default function BucketRail({ buckets = [], selectedBucketId, onSelectBucket, metaByBucket = {} }) {
  return (
    <div className="h-full w-[290px] flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Attorney Hub</p>
        <p className="mt-1 text-sm text-slate-600">Buckets first, then groups, then questions.</p>
      </div>
      <div className="space-y-2 p-3">
        {buckets.map((bucket) => {
          const active = bucket.id === selectedBucketId;
          const meta = metaByBucket[bucket.id] || {};
          return (
            <button
              key={bucket.id}
              onClick={() => onSelectBucket(bucket.id)}
              className={`w-full rounded-3xl border px-4 py-3 text-left transition ${active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{bucket.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{meta.groupCount || 0} groups · {meta.blockCount || 0} blocks</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass(meta.status || 'Not Started')}`}>
                  {meta.status || 'Not Started'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meta.needsAdmission ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Needs Admission</span> : null}
                {meta.hasProof ? <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">Has Proof</span> : null}
              </div>
            </button>
          );
        })}
        {buckets.length === 0 && <p className="px-2 text-sm text-slate-500">No buckets yet.</p>}
      </div>
    </div>
  );
}