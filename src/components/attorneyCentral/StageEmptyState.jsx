import React from 'react';
import { FileText } from 'lucide-react';

export default function StageEmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FileText className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">AttorneyCentral</h2>
        <p className="mt-2 text-sm text-slate-600">Open the exam drawer or marked proofs drawer to select a proof and start presenting.</p>
      </div>
    </div>
  );
}