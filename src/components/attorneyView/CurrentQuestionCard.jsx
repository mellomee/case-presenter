import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, StickyNote, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AdmissionEndActions from './AdmissionEndActions.jsx';
import AdmissionBlockDetails from './AdmissionBlockDetails.jsx';

function ChildItem({ item, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-4 pl-3 border-l border-slate-700' : ''}`}>
      <div
        className={`flex items-start gap-2 py-2 ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
        ) : (
          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          </div>
        )}
        <p className="text-sm text-slate-300 leading-relaxed">{item.data.text}</p>
      </div>
      {open && hasChildren && (
        <div className="mt-0.5">
          {item.children.map(child => (
            <ChildItem key={child.data.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CurrentQuestionCard({ item, index, total, examType, onSelectProof, onRuling, isRulingLoading }) {
  const [showNotes, setShowNotes] = useState(false);

  if (!item) return null;

  const {
    data: q,
    bucket,
    children = [],
    proofs: attachedProofs = [],
    blockProof,
    blockSteps = [],
    pathQuestionSets = { admitted: [], not_admitted: [] },
  } = item;

  const isBlock = q.block_type === 'AdmissionBlock';
  const accentClass = examType === 'Direct' ? 'border-green-500' : 'border-red-500';

  return (
    <div className={`bg-slate-800 rounded-xl border-l-4 ${accentClass} shadow-xl`}>
      {/* Sublabels */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{bucket?.name}</span>
        {isBlock && (
          <Badge className="bg-amber-900/50 text-amber-400 text-xs border border-amber-700/50">Admission Block</Badge>
        )}
        <span className="ml-auto text-xs text-slate-600">{index + 1} / {total}</span>
      </div>

      {/* Main Question */}
      <div className="px-5 pt-3 pb-4">
        <p className="text-2xl font-bold text-white leading-snug">{q.text}</p>
      </div>

      {!isBlock && attachedProofs.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {attachedProofs.map((proof) => (
            <button
              key={proof.id}
              onClick={() => onSelectProof(proof)}
              className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-slate-600"
            >
              <FileText className="w-3 h-3 text-amber-400" />
              <span>{proof.formal_name || proof.name}</span>
              {(proof.admitted_exhibit_num || proof.joint_exhibit_num) && (
                <span className="text-slate-400 font-mono">[{proof.admitted_exhibit_num || proof.joint_exhibit_num}]</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!isBlock && children.length > 0 && (
        <div className="px-5 pb-3">
          <div className="bg-slate-900/50 rounded-lg p-3 space-y-0.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Follow-up Questions</p>
            {children.map((child) => (
              <ChildItem key={child.data.id} item={child} />
            ))}
          </div>
        </div>
      )}

      {!isBlock && (q.expected_answer || q.notes) && (
        <div className="px-5 pb-4 flex flex-col gap-2 border-t border-slate-700/50 pt-3">
          {q.expected_answer && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                <BookOpen className="w-3.5 h-3.5" />
                Expected Answer
              </div>
              <p className="mt-1.5 text-sm text-slate-300 bg-green-950/30 border border-green-900/50 rounded-lg px-3 py-2 leading-relaxed">
                {q.expected_answer}
              </p>
            </div>
          )}
          {q.notes && (
            <div>
              <button
                onClick={() => setShowNotes((notesOpen) => !notesOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <StickyNote className="w-3.5 h-3.5" />
                Notes {showNotes ? '▲' : '▼'}
              </button>
              {showNotes && (
                <p className="mt-1.5 text-sm text-slate-300 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2 leading-relaxed">
                  {q.notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isBlock && (
        <AdmissionBlockDetails
          blockProof={blockProof}
          blockSteps={blockSteps}
          pathQuestionSets={pathQuestionSets}
          onSelectProof={onSelectProof}
        />
      )}

      {isBlock && blockProof && (
        <AdmissionEndActions
          proof={blockProof}
          onRuling={onRuling}
          isLoading={isRulingLoading}
        />
      )}
    </div>
  );
}