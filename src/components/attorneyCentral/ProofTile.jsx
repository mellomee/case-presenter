import React from 'react';
import { Eye, FileText, Tv } from 'lucide-react';
import ProofStagePills from './ProofStagePills';
import {
  getDisplayStatus,
  getPrimaryExhibitLabel,
  getProofTypeLabel,
  getRelationLabel,
  getStatusClasses,
  getTypeClasses,
} from './attorneyCentralUtils';

function getProofIcon(proof) {
  if (proof?.file_type === 'Video' || proof?.proof_child_type === 'VideoClip') return Tv;
  if (proof?.file_type === 'Image') return Eye;
  return FileText;
}

export default function ProofTile({
  proof,
  childrenByParent,
  questionCountByProofId,
  selectedId,
  onSelect,
  depth = 0,
}) {
  const Icon = getProofIcon(proof);
  const children = childrenByParent[proof.id] || [];
  const isActive = selectedId === proof.id;
  const questionCount = questionCountByProofId[proof.id] || 0;

  return (
    <div className={depth ? 'pl-4 sm:pl-6' : ''}>
      <button
        type="button"
        onClick={() => onSelect(proof)}
        className={`w-full rounded-[28px] border p-4 text-left shadow-sm transition-all ${
          isActive
            ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
            : 'border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${isActive ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                {getPrimaryExhibitLabel(proof)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isActive ? 'border-white/20 bg-white/10 text-white' : getTypeClasses(proof)}`}>
                {getProofTypeLabel(proof)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isActive ? 'border-white/20 bg-white/10 text-white' : getStatusClasses(proof)}`}>
                {getDisplayStatus(proof)}
              </span>
            </div>

            <div className="space-y-1">
              <p className="truncate text-base font-semibold sm:text-lg">{proof.formal_name || proof.name}</p>
              {proof.formal_name && <p className={`truncate text-sm ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{proof.name}</p>}
              <p className={`text-xs font-medium ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{getRelationLabel(proof)}</p>
            </div>

            <ProofStagePills proof={proof} />

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {questionCount > 0 && (
                <span className={`rounded-full px-3 py-1 ${isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {questionCount} linked question{questionCount === 1 ? '' : 's'}
                </span>
              )}
              {proof.admitted_by && (
                <span className={`rounded-full px-3 py-1 ${isActive ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                  {proof.admitted_by}
                </span>
              )}
            </div>
          </div>

          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </button>

      {children.length > 0 && (
        <div className="mt-3 space-y-3 border-l-2 border-dashed border-slate-200 pl-3 sm:pl-5">
          {children.map((child) => (
            <ProofTile
              key={child.id}
              proof={child}
              childrenByParent={childrenByParent}
              questionCountByProofId={questionCountByProofId}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}