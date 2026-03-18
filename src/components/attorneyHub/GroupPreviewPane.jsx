import React from 'react';

export default function GroupPreviewPane({ label }) {
  return (
    <div className="h-full rounded-xl border border-slate-700 bg-slate-900/60 p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-slate-300 bg-white min-h-[24rem] flex items-center justify-center p-10 text-center shadow-lg">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 mb-4">Question Group</p>
          <p className="text-3xl font-bold text-slate-800 leading-tight">{label || 'Untitled Group'}</p>
        </div>
      </div>
    </div>
  );
}