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
  const questionCount = useMemo(() => {
    const countNodes = (nodes = []) => nodes.reduce((sum, node) => sum + 1 + countNodes(node.children || []), 0);
    return countNodes(tree);
  }, [tree]);

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-sky-50/80 flex flex-col overflow-hidden shadow-sm">
      <div className="border-b border-slate-200 bg-sky-100/70 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof Questions</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{title || 'Select a proof or group'}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{questionCount} total</span>
        </div>
      </div>

      <div className="attorney-hub-scrollbar flex-1 min-h-0 overflow-y-scroll overscroll-contain p-4 pr-3 space-y-3 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
        {admissionSource && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-900">Admission Script</p>
              </div>
              <Button size="sm" className="min-h-[42px] bg-emerald-600 px-4 text-xs hover:bg-emerald-700" onClick={() => setShowSteps(true)}>
                View Script
              </Button>
            </div>
            {selectedPreviewProof && (
              <button
                type="button"
                onClick={() => onSelectInlineProof?.(selectedPreviewProof)}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
              >
                <ProofThumbPreview proof={selectedPreviewProof} size="sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Proof</p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-900">{getProofDisplayName(selectedPreviewProof)}</p>
                </div>
              </button>
            )}
          </div>
        )}

        {tree.length > 0 ? tree.map((node, index) => (
          <QuestionNode
            key={node.id}
            node={node}
            numberLabel={`${index + 1}`}
            proofsById={proofsById}
            checkedMap={checkedMap}
            onToggle={(id) => setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }))}
            onSelectInlineProof={onSelectInlineProof}
          />
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <Badge className="border border-slate-200 bg-slate-100 text-slate-700">0 questions</Badge>
            <p className="mt-3 text-sm text-slate-500">No V2 questions are mapped here yet.</p>
          </div>
        )}
      </div>

      <AdmissionStepsDialog open={showSteps} onOpenChange={setShowSteps} sourceBlock={admissionSource} templates={admissionTemplates} exhibitNum={exhibitNum} />
    </div>
  );
}