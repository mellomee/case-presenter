import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare2, Square, ScrollText } from 'lucide-react';
import ProofThumbPreview from './ProofThumbPreview.jsx';
import AdmissionStepsDialog from './AdmissionStepsDialog.jsx';
import { buildItemTree, getProofDisplayName, parseIdsField } from '@/lib/examV2Utils';

function QuestionNode({ node, level = 0, proofsById, checkedMap, onToggle, onSelectInlineProof }) {
  const attachedProofs = parseIdsField(node.attached_proof_ids).map((id) => proofsById[id]).filter(Boolean);

  return (
    <div style={{ marginLeft: `${level * 14}px` }} className="space-y-2">
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
        <button type="button" onClick={() => onToggle(node.id)} className="w-full flex items-start gap-3 text-left">
          {checkedMap[node.id] ? <CheckSquare2 className="w-4 h-4 text-blue-400 mt-0.5" /> : <Square className="w-4 h-4 text-slate-500 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-relaxed">{node.text}</p>
            {node.expected_answer && <p className="mt-2 text-xs text-green-300">Expected: {node.expected_answer}</p>}
            {node.notes && <p className="mt-1 text-xs text-amber-300">Notes: {node.notes}</p>}
          </div>
        </button>
        {attachedProofs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachedProofs.map((proof) => (
              <button
                key={proof.id}
                type="button"
                onClick={() => onSelectInlineProof(proof)}
                className="rounded-lg border border-slate-700 bg-slate-900/70 p-2 hover:border-blue-500"
              >
                <ProofThumbPreview proof={proof} size="sm" />
                <p className="mt-2 max-w-14 text-[10px] text-slate-300 leading-tight">{getProofDisplayName(proof)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      {node.children?.map((child) => (
        <QuestionNode
          key={child.id}
          node={child}
          level={level + 1}
          proofsById={proofsById}
          checkedMap={checkedMap}
          onToggle={onToggle}
          onSelectInlineProof={onSelectInlineProof}
        />
      ))}
    </div>
  );
}

export default function AttorneyHubQuestionList({
  title,
  selectedProof = null,
  parentItemId,
  questionItems = [],
  proofsById = {},
  admissionSource = null,
  admissionTemplates = [],
  exhibitNum = '',
  onSelectInlineProof,
}) {
  const [showSteps, setShowSteps] = useState(false);
  const [checkedMap, setCheckedMap] = useState({});

  const tree = useMemo(() => buildItemTree(questionItems, parentItemId || null), [questionItems, parentItemId]);
  const parentPreviewProof = useMemo(
    () => (selectedProof?.parent_proof_id ? proofsById[selectedProof.parent_proof_id] || null : null),
    [selectedProof, proofsById]
  );

  return (
    <div className="h-full rounded-2xl border border-slate-700 bg-slate-900/50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/70">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof Questions</p>
        <p className="mt-1 text-sm font-semibold text-white truncate">{title || 'Select a proof or group'}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {admissionSource && (
          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-emerald-300" />
                <p className="text-sm font-semibold text-white">Admission Script</p>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => setShowSteps(true)}>
                View Script
              </Button>
            </div>
            {parentPreviewProof && (
              <button
                type="button"
                onClick={() => onSelectInlineProof?.(parentPreviewProof)}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-left hover:border-blue-500"
              >
                <ProofThumbPreview proof={parentPreviewProof} size="sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Parent Proof</p>
                  <p className="mt-1 truncate text-xs font-medium text-white">{getProofDisplayName(parentPreviewProof)}</p>
                </div>
              </button>
            )}
          </div>
        )}

        {tree.length > 0 ? tree.map((node) => (
          <QuestionNode
            key={node.id}
            node={node}
            proofsById={proofsById}
            checkedMap={checkedMap}
            onToggle={(id) => setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }))}
            onSelectInlineProof={onSelectInlineProof}
          />
        )) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
            <Badge className="bg-slate-800 text-slate-300 border border-slate-700">0 questions</Badge>
            <p className="mt-3 text-sm text-slate-400">No V2 questions are mapped here yet.</p>
          </div>
        )}
      </div>

      <AdmissionStepsDialog open={showSteps} onOpenChange={setShowSteps} sourceBlock={admissionSource} templates={admissionTemplates} exhibitNum={exhibitNum} />
    </div>
  );
}