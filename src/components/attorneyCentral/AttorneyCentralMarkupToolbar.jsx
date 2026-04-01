import React from 'react';
import { Hand, Highlighter, PenLine, Trash2 } from 'lucide-react';

const buttonClass = (active) => `inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`;

export default function AttorneyCentralMarkupToolbar({ visible, mode, onModeChange, onClear }) {
  if (!visible) return null;

  return (
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-stone-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
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
      <button type="button" onClick={onClear} className={buttonClass(false)}>
        <Trash2 className="h-4 w-4" />
        Clear
      </button>
    </div>
  );
}