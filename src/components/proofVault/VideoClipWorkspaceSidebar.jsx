import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Play, Trash2, GripVertical, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function SegmentItem({ segment, index, onDelete }) {
  return (
    <Draggable draggableId={segment.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center gap-2 rounded-lg border p-2.5 ${snapshot.isDragging ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
        >
          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-400">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-medium text-slate-900 truncate">{segment.label || `Segment ${index + 1}`}</div>
            <div className="text-slate-500 font-mono">{segment.start} → {segment.end}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onDelete(segment.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Draggable>
  );
}

export default function VideoClipWorkspaceSidebar({
  isCollapsed,
  onToggleCollapsed,
  internalName,
  onInternalNameChange,
  formalName,
  onFormalNameChange,
  exhibitNum,
  onExhibitNumChange,
  description,
  onDescriptionChange,
  tempStartTime,
  onTempStartTimeChange,
  tempEndTime,
  onTempEndTimeChange,
  segmentLabel,
  onSegmentLabelChange,
  onMarkStart,
  onMarkEnd,
  onAddSegment,
  currentTimeLabel,
  durationLabel,
  segments,
  onDeleteSegment,
  onDragEnd,
}) {
  if (isCollapsed) {
    return (
      <div className="h-full border-r border-slate-200 bg-slate-50 p-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleCollapsed}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-72 max-w-full h-full min-h-0 overflow-hidden border-r border-slate-200 bg-slate-50 flex flex-col">
      <div className="p-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">Video Clip Workspace</div>
          <div className="text-[11px] text-slate-500 leading-tight">{segments.length} segment{segments.length === 1 ? '' : 's'} · {currentTimeLabel} / {durationLabel}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleCollapsed}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 pr-1.5 space-y-2">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mark Segment</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Start</label>
              <Input value={tempStartTime} onChange={(e) => onTempStartTimeChange(e.target.value)} placeholder="00:00:00" className="h-8 font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">End</label>
              <Input value={tempEndTime} onChange={(e) => onTempEndTimeChange(e.target.value)} placeholder="00:00:00" className="h-8 font-mono text-xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onMarkStart} className="h-8 flex-1 text-xs">
              <Play className="w-3 h-3" /> Start
            </Button>
            <Button size="sm" variant="outline" onClick={onMarkEnd} className="h-8 flex-1 text-xs">
              <Play className="w-3 h-3" /> End
            </Button>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Segment Label</label>
            <Input value={segmentLabel} onChange={(e) => onSegmentLabelChange(e.target.value)} placeholder="Optional label" className="h-8 text-xs" />
          </div>
          <Button onClick={onAddSegment} className="w-full h-8 bg-green-600 hover:bg-green-700 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Segment
          </Button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Segments</div>
          {segments.length > 0 ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="segments">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-1.5 ${snapshot.isDraggingOver ? 'rounded-lg bg-blue-50 p-1' : ''}`}
                  >
                    {segments.map((segment, idx) => (
                      <SegmentItem key={segment.id} segment={segment} index={idx} onDelete={onDeleteSegment} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <p className="text-xs text-slate-500">No segments yet.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Internal Name *</label>
            <Input value={internalName} onChange={(e) => onInternalNameChange(e.target.value)} placeholder="e.g. Witness testimony clip 1" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Formal Name</label>
            <Input value={formalName} onChange={(e) => onFormalNameChange(e.target.value)} placeholder="e.g. Deposition Clip — Accident Account" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Exhibit #</label>
            <Input value={exhibitNum} onChange={(e) => onExhibitNumChange(e.target.value)} placeholder="e.g. A-1a" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Description</label>
            <Input value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Additional notes about this clip" className="h-8 text-xs" />
          </div>
        </div>
      </div>
    </aside>
  );
}