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

  const { data: q, bucket } = item;
  const borderClass = examType === 'Direct' ? 'border-green-800/50' : 'border-red-800/50';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-slate-800/60 hover:bg-slate-800 rounded-xl border ${borderClass} px-5 py-4 transition-all group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">{bucket?.name} · Next</p>
          <p className="text-base text-slate-400 group-hover:text-slate-300 transition-colors leading-snug line-clamp-2">{q.text}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}