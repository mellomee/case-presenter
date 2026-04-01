import React from 'react';
import { ChevronLeft, ChevronRight, Hand, Highlighter, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  currentPage,
  numPages,
  pageInput,
  onPageInputChange,
  onPageInputKeyDown,
  onPageJump,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className={toolClass(tool === 'navigate')} onClick={() => onToolChange('navigate')}>
            <Hand className="h-4 w-4" /> Touch
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

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onPrevPage} disabled={currentPage <= 1} className="min-w-[44px]">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <div className="min-w-[108px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700">
              Page {currentPage} / {numPages}
            </div>
            <Button type="button" variant="outline" onClick={onNextPage} disabled={currentPage >= numPages} className="min-w-[44px]">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
            <span className="hidden text-sm text-slate-600 sm:inline">Go to</span>
            <Input
              type="number"
              min="1"
              max={numPages}
              value={pageInput}
              onChange={onPageInputChange}
              onKeyDown={onPageInputKeyDown}
              className="h-9 w-20 border-slate-200 bg-slate-50 text-center"
            />
            <Button type="button" variant="outline" onClick={onPageJump}>
              Jump
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}