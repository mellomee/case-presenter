import React, { useState } from 'react';

export default function WorkspaceQuestionItem({ question, allQuestions = [], onSaveQuestion, onAddFollowup }) {
  const [text, setText] = useState(question.text || '');
  const [expectedAnswer, setExpectedAnswer] = useState(question.expected_answer || '');
  const [notes, setNotes] = useState(question.notes || '');
  const children = allQuestions
    .filter((item) => item.parent_question_id === question.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onSaveQuestion(question.id, { text })}
        placeholder="Question text"
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
      />
      <input
        value={expectedAnswer}
        onChange={(event) => setExpectedAnswer(event.target.value)}
        onBlur={() => onSaveQuestion(question.id, { expected_answer: expectedAnswer })}
        placeholder="Expected answer"
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => onSaveQuestion(question.id, { notes })}
        placeholder="Notes"
        rows={2}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
      />
      <div className="flex justify-end">
        <button onClick={() => onAddFollowup(question)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Add Follow-up
        </button>
      </div>
      {children.length > 0 && (
        <div className="ml-4 border-l border-slate-200 pl-4">
          <div className="space-y-2">
            {children.map((child) => (
              <WorkspaceQuestionItem
                key={child.id}
                question={child}
                allQuestions={allQuestions}
                onSaveQuestion={onSaveQuestion}
                onAddFollowup={onAddFollowup}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}