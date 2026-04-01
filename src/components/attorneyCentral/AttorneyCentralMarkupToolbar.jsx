import React from 'react';
import { Hand, Highlighter, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function toolClass(isActive) {
  return isActive
    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50';
}

export default function AttorneyCentralMarkupToolbar({ open, tool, onToolChange, onUndo, onClear, canUndo }) {
  if (!open) return null;

  return (
    <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
      <Button type="button" variant="outline" className={toolClass(tool === 'pan')} onClick={() => onToolChange('pan')}>
        <Hand className="h-4 w-4" /> Pan
      </Button>
      <Button type="button" variant="outline" className={toolClass(tool === 'pen')} onClick={() => onToolChange('pen')}>
        <Pencil className="h-4 w-4" /> Pen
      </Button>
      <Button type="button" variant="outline" className={toolClass(tool === 'highlight')} onClick={() => onToolChange('highlight')}>
        <Highlighter className="h-4 w-4" /> Highlight
      </Button>
      <Button type="button" variant="outline" onClick={onUndo} disabled={!canUndo} className="border-stone-200 bg-white text-stone-700">
        <RotateCcw className="h-4 w-4" /> Undo
      </Button>
      <Button type="button" variant="outline" onClick={onClear} disabled={!canUndo} className="border-stone-200 bg-white text-stone-700">
        <Trash2 className="h-4 w-4" /> Clear
      </Button>
    </div>
  );
}