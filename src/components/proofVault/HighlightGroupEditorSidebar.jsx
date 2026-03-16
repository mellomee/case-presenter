import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function HighlightGroupEditorSidebar({
  isCollapsed,
  onToggleCollapsed,
  groups = [],
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onDeleteSelectedGroup,
  onRenameGroup,
}) {
  if (isCollapsed) {
    return (
      <div className="h-[70vh] rounded-lg border border-slate-200 bg-white p-2 flex items-start justify-center">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapsed}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="h-[70vh] rounded-lg border border-slate-200 bg-white flex flex-col overflow-hidden">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Highlight Groups</h4>
          <p className="text-xs text-slate-500">Select a group to jump to its page.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapsed}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 border-b border-slate-200 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCreateGroup} className="gap-2">
          <Plus className="w-4 h-4" /> New Group
        </Button>
        {selectedGroupId && (
          <Button type="button" size="sm" variant="ghost" onClick={onDeleteSelectedGroup} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            Delete
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {groups.length === 0 ? (
          <p className="text-xs text-slate-500">Draw on the PDF or create a group manually to begin.</p>
        ) : (
          groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group)}
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
    </aside>
  );
}