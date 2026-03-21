import React from 'react';
import { Eye } from 'lucide-react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import { getJointLabel, getProofDisplayName, getProofTypeLabel } from '@/lib/examV2Utils';

export default function ProofPickerProofCard({ proof, isSelected = false, onSelect, onPreview }) {
  return (
    <div className={`relative rounded-xl border p-3 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onPreview?.(proof);
        }}
        className={`absolute right-2 top-2 z-10 h-7 w-7 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'}`}
        title="Preview proof"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      <button type="button" onClick={() => onSelect?.(proof)} className="w-full text-left">
        <div className="flex justify-center">
          <ProofThumbPreview proof={proof} size="lg" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-green-600">{getJointLabel(proof)}</span>
          <span className="text-slate-500">{getProofTypeLabel(proof)}</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{getProofDisplayName(proof)}</p>
      </button>
    </div>
  );
}