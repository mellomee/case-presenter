import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Layers } from 'lucide-react';

export default function HighlightGroupPanel({
  groups = [],
  selectedGroupId,
  selectedGroup,
  viewMode,
  onViewModeChange,
  onSelectGroup,
}) {
  return (
    <aside className="w-80 h-full border-l border-zinc-700 bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="p-3 border-b border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold">Highlight Groups</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={viewMode === 'all' ? 'default' : 'outline'} onClick={() => onViewModeChange('all')} className="h-8 text-xs">
            <Eye className="w-3.5 h-3.5" />
            View All
          </Button>
          <Button size="sm" variant={viewMode === 'selected' ? 'default' : 'outline'} onClick={() => onViewModeChange('selected')} disabled={!selectedGroup} className="h-8 text-xs">
            <Layers className="w-3.5 h-3.5" />
            Selected Only
          </Button>
          <Button size="sm" variant={viewMode === 'hidden' ? 'default' : 'outline'} onClick={() => onViewModeChange('hidden')} className="h-8 text-xs">
            <EyeOff className="w-3.5 h-3.5" />
            Hide All
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {groups.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
            No highlight groups on this clip yet.
          </div>
        ) : (
          groups.map((group) => {
            const isSelected = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectGroup(group)}
                className={`w-full rounded-lg border p-3 text-left transition ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">{group.name || 'Untitled Group'}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Page {group.page} • {group.highlights.length} highlight{group.highlights.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  {isSelected && <span className="text-[10px] px-2 py-1 rounded bg-amber-500/20 text-amber-300">Selected</span>}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}