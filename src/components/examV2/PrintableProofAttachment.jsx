import React from 'react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { getProofPrintMeta } from '@/lib/examV2PrintUtils';

export default function PrintableProofAttachment({ proof, proofsById = {} }) {
  const meta = getProofPrintMeta(proof, proofsById);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
      <ProofThumbPreview proof={proof} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
        <p className={`mt-1 text-xs font-semibold ${meta.tone}`}>{meta.statusLabel}</p>
        {meta.exhibitLabel && <p className="mt-1 text-xs text-slate-600">{meta.exhibitLabel}</p>}
      </div>
    </div>
  );
}