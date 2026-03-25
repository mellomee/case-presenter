import React from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

export default function WitnessSavedProofDialog({ proof, onAdd, onClose }) {
  const { url, isLoading } = useResolvedProofAsset(proof);

  if (!proof) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Witness Proof Saved</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">A new witness proof is ready</h2>
            <p className="mt-1 text-sm text-slate-600">Review it, then add it to the Exhibits tab so it can be previewed, admitted, and published as usual.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            Later
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <ProofThumbPreview proof={proof} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{proof.formal_name || proof.name}</p>
              <p className="mt-1 text-sm text-slate-600">Witness: {proof.witness_name || 'Unknown witness'}</p>
              <p className="mt-1 text-xs text-slate-500">Saved markup proof</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')} disabled={!url || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            View
          </Button>
          <Button type="button" onClick={onAdd} className="bg-blue-600 hover:bg-blue-700">
            Add to Exhibits
          </Button>
        </div>
      </div>
    </div>
  );
}