import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, Plus, MessageSquare } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function QuestionItem({ question, allQuestions, proofs, index, onEdit, onDelete, onAddChild, examType }) {
  const [expanded, setExpanded] = useState(false);
  const children = allQuestions.filter(q => q.parent_question_id === question.id);
  const proofIds = Array.isArray(question.proof_ids)
    ? question.proof_ids
    : Array.isArray(question.proof_ids?.ids)
      ? question.proof_ids.ids
      : [];
  const attachedProofs = proofs.filter(p => proofIds.includes(p.id));
  const typeColor = examType === 'Direct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

  return (
    <Draggable draggableId={question.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={snapshot.isDragging ? 'opacity-60' : ''}
        >
          <div className="border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-all">
            <div className="flex items-start gap-3 p-3">
              {/* Drag handle */}
              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 flex-shrink-0 mt-0.5">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Expand toggle */}
              {children.length > 0 ? (
                <button onClick={() => setExpanded(!expanded)} className="text-slate-400 flex-shrink-0 mt-0.5">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-4 flex-shrink-0" />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 leading-snug">{question.text}</p>
                {question.expected_answer && (
                  <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">→ {question.expected_answer}</p>
                )}
                {question.notes && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {question.notes}
                  </p>
                )}
                {attachedProofs.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {attachedProofs.map(p => (
                      <span key={p.id} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                        {p.joint_exhibit_num || p.admitted_exhibit_num || p.demonstrative_exhibit_num || p.formal_name || p.name}
                      </span>
                    ))}
                  </div>
                )}
                {children.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{children.length} follow-up{children.length !== 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-blue-600"
                  title="Add follow-up question"
                  onClick={() => onAddChild(question)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-blue-600"
                  onClick={() => onEdit(question)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-600"
                  onClick={() => onDelete(question)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Children (non-draggable inline) */}
            {expanded && children.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 pl-10 pr-3 py-2 space-y-1">
                {children.map(child => (
                  <div key={child.id} className="flex items-start gap-2 py-1.5 border-l-2 border-blue-200 pl-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{child.text}</p>
                      {child.expected_answer && (
                        <p className="text-xs text-slate-400 italic mt-0.5">→ {child.expected_answer}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => onEdit(child)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600" onClick={() => onDelete(child)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function QuestionList({ questions, proofs = [], examType, onEdit, onDelete, onAddChild, onReorder }) {
  const topLevel = questions.filter(q => !q.parent_question_id);

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;
    const reordered = Array.from(topLevel);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    onReorder(reordered);
  };

  if (topLevel.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No questions yet. Add one above.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="questions">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
          >
            {topLevel.map((q, idx) => (
              <QuestionItem
                key={q.id}
                question={q}
                allQuestions={questions}
                proofs={proofs}
                index={idx}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                examType={examType}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}