import React from 'react';
import { X } from 'lucide-react';
import AttorneyCentralQuestionTree from './AttorneyCentralQuestionTree.jsx';

export default function AttorneyCentralQuestionDrawer({
  open,
  parties = [],
  selectedExamPartyId,
  onChangeParty,
  selectedExamType,
  onChangeExamType,
  rootItems = [],
  selectedRootId,
  onSelectRoot,
  questionRoots = [],
  questionChildrenMap = {},
  proofsById = {},
  checkedQuestions = {},
  onToggleQuestion,
  onSelectProof,
  rootOrderMap = {},
  onClose,
}) {
  return (
    <div className={`absolute inset-y-3 right-3 z-30 w-[min(28rem,calc(100vw-2.5rem))] rounded-[28px] border border-white/20 bg-slate-950/72 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-[120%]'}`}>
      <div className="flex h-full flex-col text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Exam Flow</div>
            <div className="mt-1 text-xl font-bold">Questions</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 bg-white/10 p-2 text-slate-200 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-white/10 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <select value={selectedExamPartyId} onChange={(event) => onChangeParty(event.target.value)} className="h-11 rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white focus:border-white/30 focus:outline-none">
              <option value="" className="text-slate-900">Select party</option>
              {parties.map((party) => <option key={party.id} value={party.id} className="text-slate-900">{party.first_name} {party.last_name}</option>)}
            </select>
            <select value={selectedExamType} onChange={(event) => onChangeExamType(event.target.value)} className="h-11 rounded-2xl border border-white/15 bg-white/10 px-3 text-sm text-white focus:border-white/30 focus:outline-none">
              <option value="Direct" className="text-slate-900">Direct</option>
              <option value="Cross" className="text-slate-900">Cross</option>
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {rootItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectRoot(item.id)}
                className={`min-w-[12rem] rounded-2xl border px-3 py-3 text-left ${selectedRootId === item.id ? 'border-blue-300/60 bg-blue-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Group {rootOrderMap[item.id] || '—'}</div>
                <div className="mt-1 text-sm font-semibold leading-tight">{item.label || item.text || 'Untitled group'}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {questionRoots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">Choose a group to see its question flow.</div>
          ) : (
            <AttorneyCentralQuestionTree
              questions={questionRoots}
              questionChildrenMap={questionChildrenMap}
              proofsById={proofsById}
              checkedQuestions={checkedQuestions}
              onToggleQuestion={onToggleQuestion}
              onSelectProof={onSelectProof}
            />
          )}
        </div>
      </div>
    </div>
  );
}