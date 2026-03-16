import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Trash2, Highlighter, MousePointer2, Hand, Move, Plus } from 'lucide-react';

export default function HighlightWorkspaceSidebar({
  isCollapsed,
  onToggleCollapsed,
  groupsOnCurrentPage,
  currentPage,
  mode,
  onModeChange,
  selectedHighlight,
  onDeleteSelectedHighlight,
  colors,
  selectedColor,
  onSelectColor,
  selectedOpacity,
  onOpacityChange,
  clipName,
  onClipNameChange,
  formalName,
  onFormalNameChange,
  draftExhibitNum,
  onDraftExhibitNumChange,
  description,
  onDescriptionChange,
  onCreateGroup,
  selectedGroupId,
  onDeleteSelectedGroup,
  highlightGroups,
  onSelectGroup,
  onRenameGroup,
}) {
  if (isCollapsed) {
    return (
      <div className="h-full border-r border-slate-200 bg-slate-50 p-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleCollapsed}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-80 max-w-full h-full border-r border-slate-200 bg-slate-50 flex flex-col">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">Highlight Workspace</div>
          <div className="text-xs text-slate-500">
            {groupsOnCurrentPage.length > 0 ? `${groupsOnCurrentPage.length} group${groupsOnCurrentPage.length === 1 ? '' : 's'} on page ${currentPage}` : `No groups on page ${currentPage} yet`}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleCollapsed}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</div>
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="icon" variant={mode === 'highlight' ? 'default' : 'ghost'} onClick={() => onModeChange('highlight')} className={mode === 'highlight' ? 'bg-blue-600 hover:bg-blue-700 h-9 w-9' : 'h-9 w-9'}>
              <Highlighter className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" variant={mode === 'select' ? 'default' : 'ghost'} onClick={() => onModeChange('select')} className={mode === 'select' ? 'bg-blue-600 hover:bg-blue-700 h-9 w-9' : 'h-9 w-9'}>
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" variant={mode === 'move-highlight' ? 'default' : 'ghost'} onClick={() => onModeChange('move-highlight')} disabled={!selectedHighlight} className={mode === 'move-highlight' ? 'bg-blue-600 hover:bg-blue-700 h-9 w-9' : 'h-9 w-9'}>
              <Move className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" variant={mode === 'pan' ? 'default' : 'ghost'} onClick={() => onModeChange('pan')} className={mode === 'pan' ? 'bg-blue-600 hover:bg-blue-700 h-9 w-9' : 'h-9 w-9'}>
              <Hand className="w-4 h-4" />
            </Button>
            {selectedHighlight && (
              <Button type="button" size="icon" variant="ghost" onClick={onDeleteSelectedHighlight} className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {mode === 'highlight'
              ? 'Draw to add to the selected group, or start a new one on this page.'
              : mode === 'select'
                ? 'Click a highlight to select it.'
                : mode === 'move-highlight'
                  ? 'Drag the selected highlight to reposition it.'
                  : 'Pan the PDF with the viewer controls.'}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Style</div>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => onSelectColor(color.hex)}
                className={`w-8 h-8 rounded border-2 transition ${selectedColor === color.hex ? 'border-slate-900 shadow-md' : 'border-slate-300 hover:border-slate-500'}`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-600">Opacity {Math.round(selectedOpacity * 100)}%</div>
            <input type="range" min="0.1" max="1" step="0.05" value={selectedOpacity} onChange={(e) => onOpacityChange(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Internal Name *</label>
            <Input value={clipName} onChange={(e) => onClipNameChange(e.target.value)} placeholder="e.g. Scene Close-up" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Formal Name</label>
            <Input value={formalName} onChange={(e) => onFormalNameChange(e.target.value)} placeholder="e.g. Photograph - Intersection Close-up" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Draft Exhibit #</label>
            <Input value={draftExhibitNum} onChange={(e) => onDraftExhibitNumChange(e.target.value)} placeholder="e.g. A-1a" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Description</label>
            <Input value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Additional notes" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">Highlight Groups</h4>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={onCreateGroup} className="gap-2">
                <Plus className="w-4 h-4" /> New
              </Button>
              {selectedGroupId && (
                <Button type="button" size="sm" variant="ghost" onClick={onDeleteSelectedGroup} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {highlightGroups.length === 0 ? (
              <p className="text-xs text-slate-500">Draw on the PDF or create a group manually to begin.</p>
            ) : (
              highlightGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onSelectGroup(group.id, group.page)}
                  className={`w-full text-left rounded-lg border p-3 transition ${selectedGroupId === group.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Input
                      value={group.name}
                      onChange={(e) => onRenameGroup(group.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8"
                    />
                    <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">Page {group.page}</span>
                  </div>
                  <div className="text-xs text-slate-600">{group.highlights.length} highlight{group.highlights.length === 1 ? '' : 's'}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}