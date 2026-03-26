import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Layers } from 'lucide-react';

export default function HighlightGroupPanel({
  isCollapsed,
  onToggleCollapsed,
  groups = [],
  selectedGroupId,
  onSelectGroup,
  onShowAll,
  showHighlights,
  onToggleHighlights,
}) {
  if (isCollapsed) {
    return (
      <div className="h-full border-r border-zinc-700 bg-zinc-950 p-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={onToggleCollapsed}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-80 max-w-full h-full border-r border-zinc-700 bg-zinc-950 flex flex-col">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">Highlight Groups</div>
          <div className="text-xs text-zinc-500">Select one group or view them all</div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={onToggleCollapsed}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 border-b border-zinc-800 flex flex-wrap gap-2">
        <Button size="sm" variant={selectedGroupId === 'all' ? 'default' : 'outline'} className={selectedGroupId === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'} onClick={onShowAll}>
          <Layers className="w-3.5 h-3.5" />
          View All
        </Button>
        <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800" onClick={onToggleHighlights}>
          {showHighlights ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showHighlights ? 'Hide Highlights' : 'Show Highlights'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {groups.length === 0 ? (
          <div className="text-xs text-zinc-500">No highlight groups saved for this clip.</div>
        ) : (
          groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${selectedGroupId === group.id ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{group.name}</div>
                  <div className="mt-1 text-xs text-zinc-400">{group.sourcePage ? `Source Pg ${group.sourcePage}` : 'Clip group'}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="whitespace-nowrap rounded bg-blue-500/15 px-2 py-1 text-[10px] text-blue-300">
                    Pg {group.page}
                  </div>
                  <div className="whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
                    {group.highlights.length} highlight{group.highlights.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}