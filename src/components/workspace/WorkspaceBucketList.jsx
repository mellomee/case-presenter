import React from 'react';

export default function WorkspaceBucketList({ buckets = [], selectedBucketId, onSelectBucket, groupCountByBucket = {} }) {
  return (
    <div className="h-full w-[280px] flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Buckets</p>
        <p className="mt-1 text-sm text-slate-600">Pick a bucket to build its grouped flow.</p>
      </div>
      <div className="space-y-2 p-3">
        {buckets.map((bucket) => {
          const active = bucket.id === selectedBucketId;
          const groupCount = groupCountByBucket[bucket.id] || 0;
          return (
            <button
              key={bucket.id}
              onClick={() => onSelectBucket(bucket.id)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
            >
              <p className="text-sm font-semibold text-slate-900">{bucket.name}</p>
              <p className="mt-1 text-xs text-slate-500">{groupCount} group{groupCount === 1 ? '' : 's'}</p>
            </button>
          );
        })}
        {buckets.length === 0 && <p className="px-2 text-sm text-slate-500">No buckets for this witness and exam type.</p>}
      </div>
    </div>
  );
}