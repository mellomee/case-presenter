import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function NextQuestionCard({ item, examType, onClick }) {
  if (!item) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 px-5 py-4 text-center">
        <p className="text-sm text-slate-600 italic">End of examination</p>
      </div>
    );
  }

  const { data: q, bucket, blockProof, pathQuestionSets } = item;
  const borderClass = examType === 'Direct' ? 'border-green-800/50' : 'border-red-800/50';
  const isBlock = q.block_type === 'AdmissionBlock';
  const branchCount = (pathQuestionSets?.admitted?.length || 0) + (pathQuestionSets?.not_admitted?.length || 0);
  const previewText = isBlock
    ? `Admission block for ${blockProof?.formal_name || blockProof?.name || 'selected proof'}`
    : q.text;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-slate-800/60 hover:bg-slate-800 rounded-xl border ${borderClass} px-5 py-4 transition-all group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            {bucket?.name} · Next{isBlock ? ' · Admission Block' : ''}
          </p>
          <p className="text-base text-slate-400 group-hover:text-slate-300 transition-colors leading-snug line-clamp-2">
            {previewText}
          </p>
          {isBlock && (
            <p className="text-xs text-slate-500 mt-2">5 scripted steps + {branchCount} branch question{branchCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}