import React from 'react';
import { Hand, Highlighter, Move, PenLine, RotateCcw, Trash2 } from 'lucide-react';

const modes = [
  { value: 'navigate', label: 'Navigate', icon: Move },
  { value: 'pen', label: 'Pen', icon: PenLine },
  { value: 'highlight', label: 'Highlight', icon: Highlighter },
  { value: 'touch', label: 'Touch', icon: Hand },
];

export default function AttorneyCentralMarkupToolbar({
  visible,
  mode,
  onModeChange,
  canUndo,
  hasMarkup,
  onUndo,
  onClear,
}) {
  if (!visible) return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-40 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
        {modes.map((item) => {
          const Icon = item.icon;
          const isActive = mode === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onModeChange(item.value)}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${isActive ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}

        <div className="mx-1 h-8 w-px bg-stone-200" />

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          Undo
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasMarkup}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}