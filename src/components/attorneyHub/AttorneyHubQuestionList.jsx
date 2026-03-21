import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare2, Square, ScrollText } from 'lucide-react';
import ProofThumbPreview from './ProofThumbPreview.jsx';
import AdmissionStepsDialog from './AdmissionStepsDialog.jsx';
import { buildItemTree, getProofDisplayName, parseIdsField } from '@/lib/examV2Utils';

function QuestionNode({ node, level = 0, numberLabel, proofsById, checkedMap, onToggle, onSelectInlineProof }) {
  const attachedProofs = parseIdsField(node.attached_proof_ids).map((id) => proofsById[id]).filter(Boolean);

  return (
    <div style={{ marginLeft: `${level * 14}px` }} className="space-y-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button type="button" onClick={() => onToggle(node.id)} className="flex min-h-[56px] w-full items-start gap-3 text-left">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-50 mt-0.5">
            {checkedMap[node.id] ? <CheckSquare2 className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-slate-500" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-semibold text-slate-500">{numberLabel}.</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-slate-900 leading-7">{node.text}</p>
                {node.expected_answer && <p className="mt-2 text-xs font-medium text-emerald-700">Expected: {node.expected_answer}</p>}
                {node.notes && <p className="mt-1 text-xs font-medium text-amber-700">Notes: {node.notes}</p>}
              </div>
            </div>
          </div>
        </button>
        {attachedProofs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2.5">
            {attachedProofs.map((proof) => (
              <button
                key={proof.id}
                type="button"
                onClick={() => onSelectInlineProof(proof)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition-colors hover:border-blue-400 hover:bg-blue-50"
              >
                <ProofThumbPreview proof={proof} size="sm" />
                <p className="mt-2 max-w-14 text-[10px] text-slate-600 leading-tight">{getProofDisplayName(proof)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      {node.children?.map((child, index) => (
        <QuestionNode
          key={child.id}
          node={child}
          level={level + 1}
          numberLabel={`${numberLabel}.${index + 1}`}
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
  const selectedPreviewProof = useMemo(() => selectedProof || null, [selectedProof]);

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
            {selectedPreviewProof && (
              <button
                type="button"
                onClick={() => onSelectInlineProof?.(selectedPreviewProof)}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-left hover:border-blue-500"
              >
                <ProofThumbPreview proof={selectedPreviewProof} size="sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Selected Proof</p>
                  <p className="mt-1 truncate text-xs font-medium text-white">{getProofDisplayName(selectedPreviewProof)}</p>
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