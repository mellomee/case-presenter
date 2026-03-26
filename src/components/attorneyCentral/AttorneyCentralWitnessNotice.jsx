import React from 'react';
import { Sparkles } from 'lucide-react';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function AttorneyCentralWitnessNotice({ proof, onAdd, onDismiss }) {
  if (!proof) return null;

  return (
    <div className="absolute right-4 top-4 z-30 max-w-sm rounded-[2rem] border border-amber-200 bg-white p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 p-2 text-amber-700">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-900">New witness proof ready</p>
          <p className="mt-1 text-sm text-stone-600">{getProofDisplayName(proof)} can be added into the marked exhibit list now.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onAdd} className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">Add to Marked</button>
            <button type="button" onClick={onDismiss} className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100">Later</button>
          </div>
        </div>
      </div>
    </div>
  );
}