import React from 'react';
import { Button } from '@/components/ui/button';
import { getExhibitLabel, getProofTypeLabel, getProofTypeTone, parseIdsField, truncateText } from '@/lib/attorneyCentralUtils';

export default function AttorneyCentralQuestionCard({ question, childMap, proofsById, checkedIds, onToggleChecked, onSelectProof, depth = 0 }) {
  const attachedProofs = parseIdsField(question.attached_proof_ids)
    .map((proofId) => proofsById[proofId])
    .filter(Boolean);
  const children = childMap[question.id] || [];
  const isChecked = checkedIds.includes(question.id);

  return (
    <div className={`space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${depth > 0 ? 'ml-4' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleChecked(question.id)}
          className={`mt-1 h-5 w-5 rounded border ${isChecked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold text-slate-900 ${isChecked ? 'opacity-60 line-through' : ''}`}>{question.text}</p>
          {question.expected_answer ? <p className="mt-1 text-xs text-slate-500">Expected: {truncateText(question.expected_answer, 64)}</p> : null}
          {question.notes ? <p className="mt-1 text-xs text-slate-500">{truncateText(question.notes, 96)}</p> : null}
        </div>
      </div>

      {attachedProofs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedProofs.map((proof) => (
            <Button
              key={proof.id}
              type="button"
              variant="outline"
              className={`h-auto min-h-11 justify-start rounded-xl px-3 py-2 text-left ${getProofTypeTone(proof)}`}
              onClick={() => onSelectProof(proof.id)}
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide">{getExhibitLabel(proof)} • {getProofTypeLabel(proof)}</div>
                <div className="text-xs font-semibold normal-case">{truncateText(proof.formal_name || proof.name, 40)}</div>
              </div>
            </Button>
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className="space-y-3 border-l border-slate-200 pl-3">
          {children.map((child) => (
            <AttorneyCentralQuestionCard
              key={child.id}
              question={child}
              childMap={childMap}
              proofsById={proofsById}
              checkedIds={checkedIds}
              onToggleChecked={onToggleChecked}
              onSelectProof={onSelectProof}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}