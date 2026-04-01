import React from 'react';
import { Hand, Highlighter, PenLine, RotateCcw, Trash2 } from 'lucide-react';

const buttonClass = (active) => `inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`;

export default function AttorneyCentralMarkupToolbar({ visible, mode, onModeChange, onUndo, onClear }) {
  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <button type="button" onClick={() => onModeChange('navigate')} className={buttonClass(mode === 'navigate')}>
        <Hand className="h-4 w-4" />
        Navigate
      </button>
      <button type="button" onClick={() => onModeChange('pen')} className={buttonClass(mode === 'pen')}>
        <PenLine className="h-4 w-4" />
        Pen
      </button>
      <button type="button" onClick={() => onModeChange('highlight')} className={buttonClass(mode === 'highlight')}>
        <Highlighter className="h-4 w-4" />
        Highlight
      </button>
      <button type="button" onClick={onUndo} className={buttonClass(false)}>
        <RotateCcw className="h-4 w-4" />
        Undo
      </button>
      <button type="button" onClick={onClear} className={buttonClass(false)}>
        <Trash2 className="h-4 w-4" />
        Clear
      </button>
    </div>
  );
}