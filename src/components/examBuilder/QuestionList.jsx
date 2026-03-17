import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical, Plus, MessageSquare, FileCheck } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function getProofIds(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.ids)) return value.ids;
  return [];
}

function getQuestionDepth(question, questionMap) {
  let depth = 0;
  let current = question;

  while (current?.parent_question_id && questionMap.has(current.parent_question_id)) {
    depth += 1;
    current = questionMap.get(current.parent_question_id);
  }

  return depth;
}

function QuestionRow({ question, proofs, examType, depth, onEdit, onDelete, onAddChild, dragHandleProps }) {
  const proofIds = getProofIds(question.proof_ids);
  const attachedProofs = proofs.filter((p) => proofIds.includes(p.id));

  return (
    <div className="border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-all" style={{ marginLeft: depth * 20 }}>
      <div className="flex items-start gap-3 p-3">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 flex-shrink-0 mt-0.5">
          <GripVertical className="w-4 h-4" />
        </div>

        <div className={`flex-1 min-w-0 ${depth > 0 ? 'border-l-2 border-blue-200 pl-3' : ''}`}>
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
              {attachedProofs.map((p) => (
                <span key={p.id} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                  {p.joint_exhibit_num || p.admitted_exhibit_num || p.demonstrative_exhibit_num || p.formal_name || p.name}
                </span>
              ))}
            </div>
          )}
          {depth > 0 && (
            <p className="text-xs text-slate-400 mt-1">Follow-up question</p>
          )}
        </div>

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
    </div>
  );
}

function BlockRow({ block, proofs, proofTypeCategories, onEditBlock, onDeleteBlock, dragHandleProps }) {
  const proof = proofs.find((p) => p.id === block.proof_id);
  const category = proofTypeCategories.find((c) => c.id === block.proof_type_category_id);
  const overrideCount = Object.keys(block.step_overrides || {}).length;
  const exhibitNum = proof?.joint_exhibit_num || proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/40">
      <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-blue-300 flex-shrink-0 mt-0.5">
        <GripVertical className="w-4 h-4" />
      </div>
      <FileCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
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
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Admission Block · 10 steps
          {overrideCount > 0 && (
            <span className="ml-2 text-amber-600 font-medium">✏️ {overrideCount} customised</span>
          )}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => onEditBlock(block)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDeleteBlock(block)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function QuestionList({
  questions,
  blocks = [],
  proofs = [],
  proofTypeCategories = [],
  examType,
  onEdit,
  onDelete,
  onAddChild,
  onEditBlock,
  onDeleteBlock,
  onReorder,
}) {
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const items = [
    ...questions.map((question) => ({
      type: 'question',
      data: question,
      depth: getQuestionDepth(question, questionMap),
    })),
    ...blocks.map((block) => ({
      type: 'block',
      data: block,
      depth: 0,
    })),
  ].sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    onReorder(reordered);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No questions or admission blocks yet.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="questions-and-blocks">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
          >
            {items.map((item, idx) => (
              <Draggable key={`${item.type}-${item.data.id}`} draggableId={`${item.type}-${item.data.id}`} index={idx}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={dragSnapshot.isDragging ? 'opacity-60' : ''}
                  >
                    {item.type === 'block' ? (
                      <BlockRow
                        block={item.data}
                        proofs={proofs}
                        proofTypeCategories={proofTypeCategories}
                        onEditBlock={onEditBlock}
                        onDeleteBlock={onDeleteBlock}
                        dragHandleProps={dragProvided.dragHandleProps}
                      />
                    ) : (
                      <QuestionRow
                        question={item.data}
                        proofs={proofs}
                        examType={examType}
                        depth={item.depth}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onAddChild={onAddChild}
                        dragHandleProps={dragProvided.dragHandleProps}
                      />
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}