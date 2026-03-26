import React from 'react';
import { X } from 'lucide-react';
import {
  getDisplayStatus,
  getPrimaryExhibitLabel,
  getStatusClasses,
  getTypeClasses,
  parseIdArray,
} from './attorneyCentralUtils';

function ProofChip({ proof, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">{getPrimaryExhibitLabel(proof)}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTypeClasses(proof)}`}>{proof.proof_child_type || proof.file_type}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(proof)}`}>{getDisplayStatus(proof)}</span>
      </div>
      <p className="mt-2 max-w-[220px] truncate text-xs font-semibold text-slate-900">{proof.formal_name || proof.name}</p>
    </button>
  );
}

export default function QuestionPanel({
  questions,
  linkedQuestions,
  proofsById,
  resolveProofSelection,
  selectedQuestionId,
  onSelectQuestion,
  mobile = false,
  open = true,
  onClose,
}) {
  const linkedIds = new Set(linkedQuestions.map((question) => question.id));
  const orderedQuestions = [...questions].sort((a, b) => Number(linkedIds.has(b.id)) - Number(linkedIds.has(a.id)));
  const shellClasses = mobile
    ? `fixed inset-y-0 right-0 z-50 w-[92vw] max-w-[420px] transform border-l border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`
    : 'flex h-full flex-col rounded-[32px] border border-slate-200 bg-white/90 shadow-xl backdrop-blur';

  return (
    <aside className={shellClasses}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Question Panel</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Proof-linked Questions</h2>
        </div>
        {mobile && (
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="border-b border-slate-200 px-5 py-4">
        <div className="rounded-[24px] bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">At a glance</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{linkedQuestions.length}</p>
          <p className="text-sm text-slate-500">questions linked to the currently selected proof or its parent proof.</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {orderedQuestions.map((question) => {
          const proofIds = parseIdArray(question.proof_ids);
          const highlighted = linkedIds.has(question.id);
          const active = selectedQuestionId === question.id;

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelectQuestion(question.id)}
              className={`w-full rounded-[28px] border p-4 text-left transition ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                  : highlighted
                    ? 'border-blue-200 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-white text-slate-900' : question.type === 'Cross' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {question.type}
                </span>
                {proofIds.length > 0 && (
                  <span className={`text-xs font-semibold ${active ? 'text-slate-300' : highlighted ? 'text-blue-700' : 'text-slate-500'}`}>
                    {proofIds.length} proof{proofIds.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold leading-6">{question.text}</p>
              {question.expected_answer && <p className={`mt-2 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>Expected: {question.expected_answer}</p>}

              {proofIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {proofIds.map((proofId) => {
                    const proof = proofsById[proofId];
                    if (!proof) return null;

                    return (
                      <ProofChip
                        key={proofId}
                        proof={proof}
                        onClick={(event) => {
                          event.stopPropagation();
                          resolveProofSelection(proofId);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}