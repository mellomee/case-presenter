import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Eye, GripVertical, Pencil, Plus, ScrollText, Trash2 } from 'lucide-react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import { getProofDisplayName, parseIdsField } from '@/lib/examV2Utils';

function Branch({ parentId, rootParentId, items, proofsById, admissionStatusMeta, onEdit, onEditScript, onAddFollowup, onDelete, onSelectAttachment }) {
  const children = items
    .filter((item) => (item.parent_item_id || null) === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const droppableId = `questions:${parentId === rootParentId ? 'root' : parentId}`;

  return (
    <Droppable droppableId={droppableId} type="QUESTION">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
          {children.map((item, index) => {
            if (item.item_type === 'admission_script') {
              return (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(dragProvided) => (
                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                      <div className="flex items-start gap-3">
                        <button type="button" {...dragProvided.dragHandleProps} className="mt-0.5 text-slate-500 hover:text-white">
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{item.label || 'Exhibit Admission Script'}</p>
                          {admissionStatusMeta ? (
                            <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${admissionStatusMeta.color}`}>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{admissionStatusMeta.label}</span>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-slate-400">This script must stay before any extract-clip or video-clip proof questions.</p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="border-slate-700 text-slate-200" onClick={onEditScript}>
                          <ScrollText className="w-3.5 h-3.5 mr-1.5" /> Edit Script
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            }

            const attachedProofs = parseIdsField(item.attached_proof_ids).map((id) => proofsById[id]).filter(Boolean);
            return (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(dragProvided) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                    <div className="flex items-start gap-3">
                      <button type="button" {...dragProvided.dragHandleProps} className="mt-0.5 text-slate-500 hover:text-white">
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white leading-relaxed">{item.text}</p>
                        {item.expected_answer && <p className="mt-2 text-xs text-green-300">Expected: {item.expected_answer}</p>}
                        {item.notes && <p className="mt-1 text-xs text-amber-300">Notes: {item.notes}</p>}
                        {attachedProofs.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attachedProofs.map((proof) => (
                              <div key={proof.id} className="relative rounded-lg border border-slate-700 bg-slate-950/70 p-2">
                                <button
                                  type="button"
                                  onClick={() => onSelectAttachment(proof)}
                                  className="absolute right-1.5 top-1.5 z-10 h-6 w-6 rounded-full border border-slate-700 bg-slate-900/90 flex items-center justify-center text-slate-300 hover:text-white"
                                  title="Preview proof"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <div className="flex justify-center">
                                  <ProofThumbPreview proof={proof} size="sm" />
                                </div>
                                <p className="mt-1 max-w-14 text-[10px] text-slate-300 leading-tight">{getProofDisplayName(proof)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => onEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => onAddFollowup(item)}><Plus className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => onDelete(item)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <div className="mt-3 pl-6">
                      <Branch
                        parentId={item.id}
                        rootParentId={rootParentId}
                        items={items}
                        proofsById={proofsById}
                        admissionStatusMeta={admissionStatusMeta}
                        onEdit={onEdit}
                        onEditScript={onEditScript}
                        onAddFollowup={onAddFollowup}
                        onDelete={onDelete}
                        onSelectAttachment={onSelectAttachment}
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            );
          })}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default function QuestionTreeEditor(props) {
  return <Branch {...props} />;
}