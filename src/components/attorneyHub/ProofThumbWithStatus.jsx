import React from 'react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';

export default function ProofThumbWithStatus({ proof, size = 'sm' }) {
  const overlayLabel = proof?.status === 'Admitted'
    ? 'Admitted'
    : proof?.status === 'Demonstrative'
      ? 'Demonstrative'
      : '';

  const overlayClass = proof?.status === 'Admitted'
    ? 'bg-green-600 text-white'
    : 'bg-purple-600 text-white';

  return (
    <div className="relative inline-flex">
      <ProofThumbPreview proof={proof} size={size} />
      {overlayLabel && (
        <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold shadow ${overlayClass}`}>
          {overlayLabel}
        </span>
      )}
    </div>
  );
}