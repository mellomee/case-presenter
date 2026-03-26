import React from 'react';
import { ChevronLeft, ChevronRight, FileText, Layers3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getProofDisplayName } from './attorneyCentralUtils';

const SIDE_ORDER = ['Plaintiff', 'Defense', 'Neutral'];

function QuestionRow({ row, proofsById, onSelectProof }) {
  if (row.itemType === 'group') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
        {row.title}
      </div>
    );
  }

  if (row.itemType === 'proof') {
    return (
      <button type="button" onClick={() => row.linkedProofId && onSelectProof(row.linkedProofId)} className={`w-full rounded-xl border p-3 text-left transition-colors ${row.isRelated ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          Linked Proof
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-900">{row.title}</p>
      </button>
    );
  }

  const attachedProofs = row.attachedProofIds.map((proofId) => proofsById[proofId]).filter(Boolean);

  return (
    <div className={`rounded-xl border p-3 ${row.isRelated ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`} style={{ marginLeft: `${Math.min(row.depth, 3) * 14}px` }}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-slate-200 text-slate-600">{row.itemType === 'admission_script' ? 'Admission' : 'Question'}</Badge>
        {row.isRelated ? <Badge className="border border-blue-200 bg-blue-100 text-blue-700">Linked to selected proof</Badge> : null}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{row.title}</p>
      {row.expectedAnswer ? <p className="mt-2 text-xs text-slate-500">Expected answer: {row.expectedAnswer}</p> : null}
      {attachedProofs.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {attachedProofs.map((proof) => (
            <button key={proof.id} type="button" onClick={() => onSelectProof(proof.id)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
              {getProofDisplayName(proof)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AttorneyCentralQuestionPanel({
  collapsed,
  onToggle,
  parties,
  selectedPartyId,
  onPartyChange,
  examType,
  onExamTypeChange,
  rows,
  proofsById,
  onSelectProof,
}) {
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-3 bg-white px-3 py-4">
        <button type="button" onClick={onToggle} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Questions</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Right Panel</p>
            <h2 className="text-lg font-bold text-slate-900">Exam Questions</h2>
          </div>
          <button type="button" onClick={onToggle} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <select value={selectedPartyId} onChange={(event) => onPartyChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-300 focus:outline-none">
            <option value="">Select party</option>
            {SIDE_ORDER.map((side) => {
              const items = parties.filter((party) => party.side === side);
              if (!items.length) return null;
              return (
                <optgroup key={side} label={side}>
                  {items.map((party) => (
                    <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
            {['Direct', 'Cross'].map((type) => (
              <Button
                key={type}
                type="button"
                variant={examType === type ? 'default' : 'ghost'}
                onClick={() => onExamTypeChange(type)}
                className={`flex-1 ${examType === type ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-700'}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {rows.length ? rows.map((row) => (
          <QuestionRow key={row.id} row={row} proofsById={proofsById} onSelectProof={onSelectProof} />
        )) : (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <Layers3 className="h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-900">No exam loaded</p>
            <p className="mt-1 text-sm text-slate-500">Choose a party and exam type to show the question flow here.</p>
          </div>
        )}
      </div>
    </div>
  );
}