import React from 'react';

function parseProofIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      return parseProofIds(JSON.parse(value));
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  if (typeof value === 'object' && Array.isArray(value.ids)) return value.ids.filter(Boolean);
  return [];
}

export default function QuestionChecklist({ questions = [], proofMap = new Map(), askedQuestionIds = {}, onToggleAsked, parentId = null, depth = 0, onSelectProof }) {
  const items = questions
    .filter((question) => (question.parent_question_id || null) === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (items.length === 0) return null;

  return (
    <div className={`space-y-2 ${depth > 0 ? 'ml-5 border-l border-slate-200 pl-4' : ''}`}>
      {items.map((question) => {
        const linkedProofs = parseProofIds(question.proof_ids)
          .map((proofId) => proofMap.get(proofId))
          .filter(Boolean);

        return (
          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={!!askedQuestionIds[question.id]}
                onChange={() => onToggleAsked(question.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${askedQuestionIds[question.id] ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{question.text}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {linkedProofs.map((proof) => (
                    <button
                      key={proof.id}
                      type="button"
                      onClick={() => onSelectProof(proof.id)}
                      className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 hover:bg-cyan-100"
                    >
                      {proof.formal_name || proof.name}
                    </button>
                  ))}
                  {question.expected_answer ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Expected answer</span> : null}
                  {question.notes ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Notes</span> : null}
                </div>
                {question.expected_answer ? <p className="mt-2 text-xs text-emerald-700">Expected: {question.expected_answer}</p> : null}
                {question.notes ? <p className="mt-1 text-xs text-amber-700">Notes: {question.notes}</p> : null}
              </div>
            </label>
            <QuestionChecklist
              questions={questions}
              proofMap={proofMap}
              askedQuestionIds={askedQuestionIds}
              onToggleAsked={onToggleAsked}
              parentId={question.id}
              depth={depth + 1}
              onSelectProof={onSelectProof}
            />
          </div>
        );
      })}
    </div>
  );
}