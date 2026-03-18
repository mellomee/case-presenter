import React from 'react';
import ProofTile from '@/components/proofVault/ProofTile';

export default function SelectableProofTile({
  proof,
  checked = false,
  disabled = false,
  onCheckedChange,
  ...tileProps
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-transparent p-1">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onCheckedChange?.(proof.id)}
        className="mt-5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="min-w-0 flex-1">
        <ProofTile proof={proof} {...tileProps} />
      </div>
    </div>
  );
}