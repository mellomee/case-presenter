import React from 'react';
import { Hand, Highlighter, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function toolClass(isActive) {
  return isActive
    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
}

export default function MarkupToolbar({
  tool,
  onToolChange,
  onUndo,
  onClear,
  canUndo,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className={toolClass(tool === 'navigate')} onClick={() => onToolChange('navigate')}>
          <Hand className="h-4 w-4" /> Touch Navigation
        </Button>
        <Button type="button" variant="outline" className={toolClass(tool === 'pen')} onClick={() => onToolChange('pen')}>
          <Pencil className="h-4 w-4" /> Draw
        </Button>
        <Button type="button" variant="outline" className={toolClass(tool === 'highlight')} onClick={() => onToolChange('highlight')}>
          <Highlighter className="h-4 w-4" /> Highlight
        </Button>
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