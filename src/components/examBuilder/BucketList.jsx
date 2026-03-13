import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function BucketList({
  buckets,
  trialPoints,
  onEdit,
  onDelete,
  onReorder,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const getTrialPointName = (trialPointId) => {
    return trialPoints.find((tp) => tp.id === trialPointId)?.name || null;
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) {
      setIsDragging(false);
      return;
    }

    const newBuckets = Array.from(buckets);
    const [movedBucket] = newBuckets.splice(source.index, 1);
    newBuckets.splice(destination.index, 0, movedBucket);
    
    onReorder(newBuckets);
    setIsDragging(false);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragStart={() => setIsDragging(true)}>
      <Droppable droppableId="buckets">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-3' : ''}`}
          >
            {buckets.map((bucket, index) => {
              const trialPointName = getTrialPointName(bucket.trial_point_id);

              return (
                <Draggable key={bucket.id} draggableId={bucket.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'opacity-50' : ''}
                    >
                      <Card className="border-slate-200 hover:shadow-md transition-all">
                        <div className="p-4 flex items-center gap-4">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-slate-400 flex-shrink-0"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {/* Bucket Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900">{bucket.name}</h3>
                            {trialPointName && (
                              <p className="text-xs text-slate-600 mt-1">
                                Trial Point: <span className="font-medium">{trialPointName}</span>
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(bucket)}
                              className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(bucket.id)}
                              className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
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