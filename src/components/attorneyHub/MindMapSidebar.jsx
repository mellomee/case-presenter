import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

function Badge({ badge }) {
  const toneClass = {
    slate: 'bg-slate-800 text-slate-300 border border-slate-700',
    blue: 'bg-blue-500/15 text-blue-300 border border-blue-400/30',
    green: 'bg-green-500/15 text-green-300 border border-green-400/30',
    amber: 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-400/30',
    red: 'bg-red-500/15 text-red-300 border border-red-400/30',
  };

  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClass[badge.tone] || toneClass.slate}`}>{badge.label}</span>;
}

function TreeItem({ item, level = 0, selectedNodeId, openMap, onToggle, onSelect }) {
  const isOpen = openMap[item.id] ?? true;
  const hasChildren = item.children?.length > 0;
  const isSelected = item.nodeId && selectedNodeId === item.nodeId;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => item.nodeId ? onSelect(item.nodeId, item.type) : hasChildren && onToggle(item.id)}
        className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${isSelected ? 'bg-blue-500/15 text-white' : 'text-slate-300 hover:bg-slate-800/80'}`}
        style={{ paddingLeft: `${level * 14 + 10}px` }}
      >
        {hasChildren ? (
          <span
            className="mt-0.5 text-slate-500"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(item.id);
            }}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ) : (
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-600" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium">{item.label}</p>
          {item.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.badges.map((badge) => <Badge key={badge.label} badge={badge} />)}
            </div>
          )}
        </div>
      </button>

      {hasChildren && isOpen && (
        <div className="space-y-1">
          {item.children.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              openMap={openMap}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MindMapSidebar({ treeItems = [], selectedNodeId, onSelect }) {
  const initialOpenState = useMemo(() => {
    const map = {};
    const walk = (items) => {
      items.forEach((item) => {
        map[item.id] = true;
        if (item.children?.length) walk(item.children);
      });
    };
    walk(treeItems);
    return map;
  }, [treeItems]);

  const [openMap, setOpenMap] = useState(initialOpenState);

  React.useEffect(() => {
    setOpenMap(initialOpenState);
  }, [initialOpenState]);

  return (
    <aside className="w-[280px] shrink-0 border-r border-slate-800 bg-slate-950/80 backdrop-blur min-h-0 flex flex-col">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Navigator</h2>
        <p className="mt-1 text-xs text-slate-400">Party → Witness → Trial Point → Bucket</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1.5">
          {treeItems.map((item) => (
            <TreeItem
              key={item.id}
              item={item}
              selectedNodeId={selectedNodeId}
              openMap={openMap}
              onToggle={(id) => setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }))}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}