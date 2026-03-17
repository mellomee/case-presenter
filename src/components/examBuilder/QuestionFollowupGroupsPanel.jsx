import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2, MessageSquare } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';

function getProofIds(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.ids)) return value.ids;
  return [];
}

function buildPartyLabel(question) {
  return question.follow_up_group || 'Other';
}

function FollowupQuestionCard({ question, proofs, onEdit, onDelete, onAddChild, dragHandleProps, childrenPanel }) {
  const proofIds = getProofIds(question.proof_ids);
  const attachedProofs = proofs.filter((proof) => proofIds.includes(proof.id));

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-3">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 flex-shrink-0 mt-0.5">
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge className="bg-slate-100 text-slate-600 text-[11px]">{buildPartyLabel(question)}</Badge>
          </div>
          <p className="text-sm font-medium text-slate-900 leading-snug">{question.text}</p>
          {question.expected_answer && (
            <p className="text-xs text-slate-500 italic mt-1">→ {question.expected_answer}</p>
          )}
          {question.notes && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {question.notes}
            </p>
          )}
          {attachedProofs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {attachedProofs.map((proof) => (
                <span key={proof.id} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                  {proof.joint_exhibit_num || proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.formal_name || proof.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-blue-600"
            title="Add follow-up question"
            onClick={() => onAddChild({ ...question, follow_up_group: question.follow_up_group || null })}
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

      {childrenPanel && <div className="border-t border-slate-100 p-3 bg-slate-50/70">{childrenPanel}</div>}
    </div>
  );
}

function FollowupGroupSection({ title, groupKey, items, parentQuestion, proofs, questions, onEdit, onDelete, onAddChild }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/70">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{items.length} question{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => onAddChild({ ...parentQuestion, follow_up_group: groupKey === 'Other' ? null : groupKey })}
          className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
        >
          Add Question
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-3 text-xs text-slate-500">No questions in this group yet.</div>
      ) : (
        <Droppable droppableId={`followup::${parentQuestion.id}::${groupKey}`} type="followup-question">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 p-3 ${snapshot.isDraggingOver ? 'bg-slate-100/70 rounded-b-lg' : ''}`}
            >
              {items.map((question, index) => {
                const hasNestedChildren = questions.some((item) => item.parent_question_id === question.id);

                return (
                  <Draggable key={`followup-${question.id}`} draggableId={`followup-${question.id}`} index={index}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={dragSnapshot.isDragging ? 'opacity-70' : ''}
                      >
                        <FollowupQuestionCard
                          question={question}
                          proofs={proofs}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onAddChild={onAddChild}
                          dragHandleProps={dragProvided.dragHandleProps}
                          childrenPanel={hasNestedChildren ? (
                            <QuestionFollowupGroupsPanel
                              parentQuestion={question}
                              questions={questions}
                              proofs={proofs}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onAddChild={onAddChild}
                              isNested
                            />
                          ) : null}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

export default function QuestionFollowupGroupsPanel({
  parentQuestion,
  questions,
  proofs,
  onEdit,
  onDelete,
  onAddChild,
  isNested = false,
}) {
  const [isOpen, setIsOpen] = useState(isNested);

  const directChildren = useMemo(
    () => questions
      .filter((question) => question.parent_question_id === parentQuestion.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [questions, parentQuestion.id]
  );

  const forgotItems = directChildren.filter((question) => question.follow_up_group === 'Forgot');
  const denyItems = directChildren.filter((question) => question.follow_up_group === 'Deny');
  const otherItems = directChildren.filter((question) => !question.follow_up_group);
  const totalItems = directChildren.length;

  return (
    <div className={`rounded-lg border ${isNested ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/80'} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">Forgot / Deny Follow-ups</p>
          <p className="text-xs text-slate-500 mt-0.5">{totalItems} grouped follow-up question{totalItems !== 1 ? 's' : ''}</p>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>

      {isOpen && (
        <div className="space-y-3 px-3 pb-3">
          <FollowupGroupSection
            title="Forgot"
            groupKey="Forgot"
            items={forgotItems}
            parentQuestion={parentQuestion}
            proofs={proofs}
            questions={questions}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
          <FollowupGroupSection
            title="Deny"
            groupKey="Deny"
            items={denyItems}
            parentQuestion={parentQuestion}
            proofs={proofs}
            questions={questions}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
          {otherItems.length > 0 && (
            <FollowupGroupSection
              title="Other"
              groupKey="Other"
              items={otherItems}
              parentQuestion={parentQuestion}
              proofs={proofs}
              questions={questions}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          )}
        </div>
      )}
    </div>
  );
}