import React from 'react';
import { Highlighter, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function toolClass(isActive) {
  return isActive
    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
}

export default function MarkupToolbar({
  witnessName,
  onWitnessNameChange,
  witnessNameDisabled = false,
  tool,
  onToolChange,
  onUndo,
  onClear,
  canUndo,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={witnessName}
            onChange={(event) => onWitnessNameChange(event.target.value)}
            placeholder="Witness name"
            disabled={witnessNameDisabled}
            className="h-11 min-w-[220px] border-slate-200 bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className={toolClass(tool === 'pen')} onClick={() => onToolChange('pen')}>
              <Pencil className="h-4 w-4" /> Freehand
            </Button>
            <Button type="button" variant="outline" className={toolClass(tool === 'highlight')} onClick={() => onToolChange('highlight')}>
              <Highlighter className="h-4 w-4" /> Highlight
            </Button>
          </div>
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
    </div>
  );
}