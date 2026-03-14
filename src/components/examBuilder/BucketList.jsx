import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, Plus, FileCheck } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import QuestionList from './QuestionList.jsx';
import AdmissionBlockList from './AdmissionBlockList.jsx';

export default function BucketList({
  buckets,
  trialPoints,
  questions = [],
  proofs = [],
  proofTypeCategories = [],
  admissionBlocks = [],
  examType,
  onEdit,
  onDelete,
  onReorder,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onAddChildQuestion,
  onReorderQuestions,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
}) {
  const [expandedBuckets, setExpandedBuckets] = useState({});

  const toggleBucket = (bucketId) => {
    setExpandedBuckets(prev => ({ ...prev, [bucketId]: !prev[bucketId] }));
  };

  const getTrialPointName = (trialPointId) =>
    trialPoints.find((tp) => tp.id === trialPointId)?.name || null;

  const getBucketQuestions = (bucketId) =>
    questions.filter((q) => q.bucket_id === bucketId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;
    const newBuckets = Array.from(buckets);
    const [movedBucket] = newBuckets.splice(source.index, 1);
    newBuckets.splice(destination.index, 0, movedBucket);
    onReorder(newBuckets);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="buckets">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-3' : ''}`}
          >
            {buckets.map((bucket, index) => {
              const trialPointName = getTrialPointName(bucket.trial_point_id);
              const bucketQuestions = getBucketQuestions(bucket.id);
              const bucketBlocks = admissionBlocks.filter(b => b.bucket_id === bucket.id).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
              const isExpanded = !!expandedBuckets[bucket.id];
              const qCount = bucketQuestions.filter(q => !q.parent_question_id).length;
              const bCount = bucketBlocks.length;

              return (
                <Draggable key={bucket.id} draggableId={bucket.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'opacity-50' : ''}
                    >
                      <Card className={`border-slate-200 transition-all ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
                        {/* Bucket Header */}
                        <div className="p-4 flex items-center gap-3">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-slate-400 flex-shrink-0"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {/* Expand toggle */}
                          <button
                            onClick={() => toggleBucket(bucket.id)}
                            className="text-slate-400 flex-shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>

                          {/* Bucket Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{bucket.name}</h3>
                              {qCount > 0 && (
                                <Badge className="bg-slate-100 text-slate-600 text-xs">{qCount} Q</Badge>
                              )}
                              {bCount > 0 && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">{bCount} Block{bCount !== 1 ? 's' : ''}</Badge>
                              )}
                            </div>
                            {trialPointName && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Trial Point: <span className="font-medium">{trialPointName}</span>
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddBlock(bucket)}
                              className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                            >
                              <FileCheck className="w-3.5 h-3.5" /> Add Block
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddQuestion(bucket)}
                              className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Q
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(bucket)}
                              className="h-9 w-9 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(bucket.id)}
                              className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Panel */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
                            {bucketBlocks.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Admission Blocks</p>
                                <AdmissionBlockList
                                  blocks={bucketBlocks}
                                  proofs={proofs}
                                  proofTypeCategories={proofTypeCategories}
                                  onEdit={onEditBlock}
                                  onDelete={onDeleteBlock}
                                />
                              </div>
                            )}
                            <div>
                              {(bucketBlocks.length > 0 || bucketQuestions.filter(q => !q.parent_question_id).length > 0) && (
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Questions</p>
                              )}
                              <QuestionList
                                questions={bucketQuestions}
                                proofs={proofs}
                                examType={examType}
                                onEdit={onEditQuestion}
                                onDelete={onDeleteQuestion}
                                onAddChild={onAddChildQuestion}
                                onReorder={(reordered) => onReorderQuestions(reordered, bucket.id)}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}