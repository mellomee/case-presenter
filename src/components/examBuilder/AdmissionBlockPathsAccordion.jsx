import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, FileCheck, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';

function parseObjectValue(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function normalizeProofIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return [value].filter(Boolean);
  if (typeof value === 'object' && Array.isArray(value.ids)) return value.ids.filter(Boolean);
  return [];
}

function hydrateNodes(nodes, proofs) {
  return (Array.isArray(nodes) ? nodes : []).map((node, index) => ({
    ...node,
    id: node.id || `${node.admission_path || 'path'}-${index + 1}`,
    attachedProofs: normalizeProofIds(node.proof_ids)
      .map((proofId) => proofs.find((proof) => proof.id === proofId))
      .filter(Boolean),
    children: hydrateNodes(node.children || [], proofs),
  }));
}

export function parseBlockPathQuestionSets(block, proofs = []) {
  const parsed = parseObjectValue(block?.path_question_sets, { admitted: [], not_admitted: [] }) || { admitted: [], not_admitted: [] };

  return {
    admitted: hydrateNodes(parsed.admitted || [], proofs),
    not_admitted: hydrateNodes(parsed.not_admitted || [], proofs),
  };
}

function PathQuestionCard({ node, depth = 0, dragHandleProps, proofs }) {
  return (
    <div className={`${depth > 0 ? 'ml-4 pl-4 border-l border-slate-200' : ''}`}>
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 mt-0.5 flex-shrink-0"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 leading-relaxed">{node.text || 'Untitled question'}</p>

            {node.expected_answer && (
              <p className="text-xs text-slate-500 italic mt-1">→ {node.expected_answer}</p>
            )}

            {node.notes && (
              <p className="text-xs text-amber-700 mt-1">Notes: {node.notes}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {(node.attachedProofs || []).map((proof) => (
                <span
                  key={proof.id}
                  className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono"
                >
                  {proof.joint_exhibit_num || proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.formal_name || proof.name}
                </span>
              ))}
              {node.children?.length > 0 && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {node.children.length} follow-up{node.children.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {node.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          <PathNodeList
            nodes={node.children}
            blockId={node.blockId}
            pathKey={node.pathKey}
            parentId={node.id}
            depth={depth + 1}
            proofs={proofs}
          />
        </div>
      )}
    </div>
  );
}

function PathNodeList({ nodes, blockId, pathKey, parentId = 'root', depth = 0, proofs }) {
  return (
    <Droppable droppableId={`${blockId}::${pathKey}::${parentId}`} type="block-path-question">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`space-y-2 ${snapshot.isDraggingOver ? 'rounded-lg bg-slate-100/80 p-2' : ''}`}
        >
          {nodes.map((node, index) => (
            <Draggable key={`${blockId}-${pathKey}-${node.id}`} draggableId={`${blockId}-${pathKey}-${node.id}`} index={index}>
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  className={dragSnapshot.isDragging ? 'opacity-80' : ''}
                >
                  <PathQuestionCard
                    node={{ ...node, blockId, pathKey }}
                    depth={depth}
                    dragHandleProps={dragProvided.dragHandleProps}
                    proofs={proofs}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function PathSection({ title, toneClass, pathKey, nodes, blockId, proofs, onAddQuestion }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [draftText, setDraftText] = useState('');

  const handleSave = () => {
    if (!draftText.trim()) return;
    onAddQuestion?.(pathKey, draftText.trim());
    setDraftText('');
    setIsAdding(false);
  };

  return (
    <div className={`rounded-lg border ${toneClass}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="flex-1 flex items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{nodes.length} top-level question{nodes.length !== 1 ? 's' : ''}</p>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </button>

        <Button type="button" size="sm" onClick={() => setIsAdding((value) => !value)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs shrink-0">
          Add Question
        </Button>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {isAdding && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <Input
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="Type the new question..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSave();
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleSave} disabled={!draftText.trim()} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                  Save Question
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraftText('');
                    setIsAdding(false);
                  }}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {nodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-3 text-xs text-slate-500">
              No questions in this path yet.
            </div>
          ) : (
            <PathNodeList nodes={nodes} blockId={blockId} pathKey={pathKey} proofs={proofs} />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdmissionBlockPathsAccordion({
  block,
  proofs,
  proofTypeCategories,
  onEditBlock,
  onDeleteBlock,
  onAddPathQuestion,
  dragHandleProps,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const proof = proofs.find((p) => p.id === block.proof_id);
  const category = proofTypeCategories.find((c) => c.id === block.proof_type_category_id);
  const overrideCount = Object.keys(block.step_overrides || {}).length;
  const exhibitNum = proof?.joint_exhibit_num || proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num;
  const pathSets = useMemo(() => parseBlockPathQuestionSets(block, proofs), [block, proofs]);
  const admittedCount = pathSets.admitted.length;
  const notAdmittedCount = pathSets.not_admitted.length;

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-blue-300 flex-shrink-0 mt-0.5">
          <GripVertical className="w-4 h-4" />
        </div>

        <button type="button" onClick={() => setIsOpen((value) => !value)} className="text-blue-500 flex-shrink-0 mt-0.5">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <FileCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />

        <button type="button" onClick={() => setIsOpen((value) => !value)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">
              {proof?.formal_name || proof?.name || 'Unknown Proof'}
            </p>
            {exhibitNum && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">{exhibitNum}</span>
            )}
            {category && (
              <Badge className="bg-slate-100 text-slate-600 text-xs">{category.name}</Badge>
            )}
            <Badge className="bg-green-100 text-green-700 text-xs">Path 1: {admittedCount}</Badge>
            <Badge className="bg-red-100 text-red-700 text-xs">Path 2: {notAdmittedCount}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Admission Block · 10 steps
            {overrideCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">✏️ {overrideCount} customised</span>
            )}
            <span className="ml-2 text-blue-700 font-medium">{isOpen ? 'Hide paths' : 'Show paths'}</span>
          </p>
        </button>

        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => onEditBlock(block)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDeleteBlock(block)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-blue-100 bg-white/70 p-3 space-y-3">
          <PathSection
            title="Path 1 — Admitted / Demonstrative"
            toneClass="border-green-200 bg-green-50/60"
            pathKey="admitted"
            nodes={pathSets.admitted}
            blockId={block.id}
            proofs={proofs}
            onAddQuestion={(pathKey, text) => onAddPathQuestion?.(block, pathKey, text)}
          />
          <PathSection
            title="Path 2 — Not Admitted"
            toneClass="border-red-200 bg-red-50/60"
            pathKey="not_admitted"
            nodes={pathSets.not_admitted}
            blockId={block.id}
            proofs={proofs}
            onAddQuestion={(pathKey, text) => onAddPathQuestion?.(block, pathKey, text)}
          />
        </div>
      )}
    </div>
  );
}