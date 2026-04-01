import React from 'react';
import { Hand, Highlighter, Pencil, Trash2 } from 'lucide-react';

const modes = [
  { id: 'navigate', label: 'Navigate', icon: Hand },
  { id: 'pen', label: 'Pen', icon: Pencil },
  { id: 'highlight', label: 'Highlight', icon: Highlighter },
];

export default function AttorneyCentralLiveMarkupToolbar({ enabled, mode, onModeChange, onClear }) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-lg backdrop-blur">
      {modes.map(({ id, label, icon: Icon }) => {
        const active = enabled && mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onModeChange(id)}
            className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}

      <div className="mx-1 h-8 w-px bg-stone-200" />

      <button
        type="button"
        onClick={onClear}
        disabled={!enabled}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
        Clear
      </button>
    </div>
  );
}