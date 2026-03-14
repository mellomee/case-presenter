import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function TrialPointList({ trialPoints, categories, buckets, onEdit, onDelete, onReorder }) {
  const getCategoryName = (categoryId) =>
    categories.find((c) => c.id === categoryId)?.name || null;

  const getBucketCount = (trialPointId) =>
    buckets.filter((b) => b.trial_point_id === trialPointId).length;

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;
    const reordered = Array.from(trialPoints);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    onReorder(reordered);
  };

  if (trialPoints.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FolderOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm">No trial points yet. Create one to organise your buckets.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="trial-points">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
          >
            {trialPoints.map((tp, index) => {
              const categoryName = getCategoryName(tp.category_id);
              const bucketCount = getBucketCount(tp.id);

              return (
                <Draggable key={tp.id} draggableId={tp.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'opacity-60' : ''}
                    >
                      <Card className="border-slate-200 hover:shadow-sm transition-all">
                        <div className="p-4 flex items-center gap-3">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{tp.name}</span>
                              {categoryName && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">{categoryName}</Badge>
                              )}
                              {bucketCount > 0 && (
                                <Badge className="bg-slate-100 text-slate-600 text-xs">
                                  {bucketCount} bucket{bucketCount !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => onEdit(tp)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => onDelete(tp)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
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