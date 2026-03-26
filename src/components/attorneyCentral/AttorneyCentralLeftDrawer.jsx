import React from 'react';
import { ChevronLeft, X } from 'lucide-react';
import AttorneyCentralQuestionCard from '@/components/attorneyCentral/AttorneyCentralQuestionCard.jsx';

export default function AttorneyCentralLeftDrawer({ open, onClose, parties = [], selectedPartyId, onPartyChange, selectedExamType, onExamTypeChange, rootItems = [], selectedRootId, onSelectRoot, questionRoots = [], childMap = {}, proofsById = {}, checkedIds = [], onToggleChecked, onSelectProof }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-[min(30rem,92vw)] border-r border-slate-200 bg-slate-50 shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Exam Navigator</p>
              <h2 className="text-lg font-bold text-slate-900">Questions</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <select value={selectedPartyId} onChange={(event) => onPartyChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              {parties.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
            </select>
            <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
              {['Direct', 'Cross'].map((type) => (
                <button key={type} type="button" onClick={() => onExamTypeChange(type)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedExamType === type ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {rootItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectRoot(item.id)}
                className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${selectedRootId === item.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {item.label || item.text || `Section ${index + 1}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-28">
          {questionRoots.length > 0 ? questionRoots.map((question) => (
            <AttorneyCentralQuestionCard
              key={question.id}
              question={question}
              childMap={childMap}
              proofsById={proofsById}
              checkedIds={checkedIds}
              onToggleChecked={onToggleChecked}
              onSelectProof={(proofId) => {
                onSelectProof(proofId);
                onClose();
              }}
            />
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No questions in this section yet.</div>
          )}
        </div>
      </div>
      <button type="button" onClick={onClose} className="absolute right-[-44px] top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-slate-200 bg-white text-slate-500 shadow-sm lg:flex">
        <ChevronLeft className="h-5 w-5" />
      </button>
    </aside>
  );
}