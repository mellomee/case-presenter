import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import { getProofDisplayName, getProofTypeLabel } from '@/lib/examV2Utils';

function getCardClasses(depth) {
  if (depth === 0) return 'border-slate-200 bg-white';
  if (depth === 1) return 'border-blue-300 bg-blue-100';
  return 'border-amber-300 bg-amber-100';
}

function getProofTypeLabelText(proof) {
  const label = getProofTypeLabel(proof);
  if (label === 'ExtractClip') return 'Extract Clip';
  if (label === 'VideoClip') return 'Video Clip';
  return label;
}

export default function InlineProofReferenceTree({
  proof,
  proofsById,
  childMap,
  visibleIds,
  attachedProofIds,
  onToggleProof,
  onPreviewProof,
  previewProofId,
  depth = 0,
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const children = useMemo(
    () => (childMap[proof.id] || []).filter((child) => visibleIds.has(child.id)),
    [childMap, proof.id, visibleIds]
  );
  const hasChildren = children.length > 0;
  const autoExpand = useMemo(
    () => children.some((child) => attachedProofIds.includes(child.id) || previewProofId === child.id),
    [attachedProofIds, children, previewProofId]
  );
  const parentProof = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
  const active = attachedProofIds.includes(proof.id);
  const party = proof.party || null;

  useEffect(() => {
    if (autoExpand) setExpanded(true);
  }, [autoExpand]);

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-3 shadow-sm ${getCardClasses(depth)}`}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => hasChildren && setExpanded((value) => !value)}
            className={`mt-1 flex h-5 w-5 items-center justify-center text-slate-500 ${hasChildren ? 'hover:text-slate-900' : 'cursor-default opacity-40'}`}
          >
            {hasChildren ? (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="h-4 w-4" />}
          </button>

          <ExamBuilderProofThumb proof={proof} size={depth === 0 ? 'md' : 'sm'} theme="light" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
                <p className="mt-1 text-xs text-slate-500">Internal: {proof.name || '—'}</p>
                {parentProof && <p className="mt-1 text-xs text-slate-500">Child of {getProofDisplayName(parentProof)}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPreviewProof(proof)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${previewProofId === proof.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'}`}
                  title="Preview proof"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Button
                  variant={active ? 'outline' : 'default'}
                  className={active ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-blue-600 text-white hover:bg-blue-700'}
                  onClick={() => onToggleProof(proof.id)}
                >
                  {active ? 'Attached' : 'Attach'}
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">{getProofTypeLabelText(proof)}</span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">{proof.proof_category === 'Deposition' ? 'Deposition' : (proof.status || 'Draft')}</span>
              {party && <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">{party.first_name} {party.last_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="ml-6 space-y-3 border-l-2 border-slate-200 pl-4">
          {children.map((child) => (
            <InlineProofReferenceTree
              key={child.id}
              proof={child}
              proofsById={proofsById}
              childMap={childMap}
              visibleIds={visibleIds}
              attachedProofIds={attachedProofIds}
              onToggleProof={onToggleProof}
              onPreviewProof={onPreviewProof}
              previewProofId={previewProofId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}