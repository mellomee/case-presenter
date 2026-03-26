import React from 'react';
import AttorneyCentralProofPill from './AttorneyCentralProofPill.jsx';
import { getLinkedProofIds } from '@/lib/attorneyCentralUtils';

export default function AttorneyCentralQuestionTree({
  questions = [],
  questionChildrenMap = {},
  proofsById = {},
  checkedQuestions = {},
  onToggleQuestion,
  onSelectProof,
  depth = 0,
}) {
  return (
    <div className="space-y-3">
      {questions.map((question) => {
        const linkedProofs = getLinkedProofIds(question).map((id) => proofsById[id]).filter(Boolean);
        const children = questionChildrenMap[question.id] || [];
        const isChecked = Boolean(checkedQuestions[question.id]);

        return (
          <div key={question.id} className="space-y-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white backdrop-blur">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={isChecked} onChange={() => onToggleQuestion(question.id)} className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent" />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium leading-relaxed ${isChecked ? 'text-slate-400 line-through' : 'text-white'}`}>{question.text || question.label || 'Untitled question'}</div>
                  {question.expected_answer ? <div className="mt-1 text-xs text-slate-300">Expected: {question.expected_answer}</div> : null}
                </div>
              </label>

              {linkedProofs.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {linkedProofs.map((proof) => (
                    <AttorneyCentralProofPill key={proof.id} proof={proof} compact onClick={() => onSelectProof(proof.id)} />
                  ))}
                </div>
              ) : null}
            </div>

            {children.length > 0 ? (
              <div className="border-l border-white/15 pl-4">
                <AttorneyCentralQuestionTree
                  questions={children}
                  questionChildrenMap={questionChildrenMap}
                  proofsById={proofsById}
                  checkedQuestions={checkedQuestions}
                  onToggleQuestion={onToggleQuestion}
                  onSelectProof={onSelectProof}
                  depth={depth + 1}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}