import React from 'react';
import { Hand, Highlighter, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function toolClass(isActive) {
  return isActive
    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
}

export default function AttorneyLiveMarkupToolbar({ mode, tool, onModeChange, onToolChange, onUndo, onClear, canUndo }) {
  return (
    <div className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className={toolClass(mode === 'navigate')} onClick={() => onModeChange('navigate')}>
          <Hand className="h-4 w-4" /> Touch Navigate
        </Button>
        <Button type="button" variant="outline" className={toolClass(mode === 'markup' && tool === 'pen')} onClick={() => { onModeChange('markup'); onToolChange('pen'); }}>
          <Pencil className="h-4 w-4" /> Pen
        </Button>
        <Button type="button" variant="outline" className={toolClass(mode === 'markup' && tool === 'highlight')} onClick={() => { onModeChange('markup'); onToolChange('highlight'); }}>
          <Highlighter className="h-4 w-4" /> Highlight
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onUndo} disabled={!canUndo} className="border-slate-200 bg-white text-slate-700">
          <RotateCcw className="h-4 w-4" /> Undo
        </Button>
        <Button type="button" variant="outline" onClick={onClear} disabled={!canUndo} className="border-slate-200 bg-white text-slate-700">
          <Trash2 className="h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}