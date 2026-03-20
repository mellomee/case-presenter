import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Trash2, Highlighter, MousePointer2, Hand, Move, Plus, Star } from 'lucide-react';

const RECENT_COLORS_KEY = 'highlight_recent_colors';
const MAX_RECENT = 10;

function loadRecentColors() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentColor(hex) {
  const recent = loadRecentColors().filter((c) => c !== hex);
  recent.unshift(hex);
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const PRESET_COLORS = [
  '#FEF3C7', // Yellow
  '#D1FAE5', // Green
  '#DBEAFE', // Blue
  '#FEE2E2', // Red
  '#EDE9FE', // Purple
  '#FFE4E6', // Pink
  '#ECFDF5', // Mint
  '#FFF7ED', // Orange
  '#F0F9FF', // Sky
  '#F5F3FF', // Violet
];

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
  const colorInputRef = useRef(null);
  const [recentColors, setRecentColors] = React.useState(loadRecentColors);
  const [colorPanelCollapsed, setColorPanelCollapsed] = React.useState(false);

  const handleColorPicked = (hex) => {
    saveRecentColor(hex);
    setRecentColors(loadRecentColors());
    onSelectColor(hex);
  };
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
    <aside className="w-72 max-w-full h-full min-h-0 overflow-hidden border-r border-slate-200 bg-slate-50 flex flex-col">
      <div className="p-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">Highlight Workspace</div>
          <div className="text-[11px] text-slate-500 leading-tight">
            {groupsOnCurrentPage.length > 0 ? `${groupsOnCurrentPage.length} group${groupsOnCurrentPage.length === 1 ? '' : 's'} on page ${currentPage}` : `No groups on page ${currentPage} yet`}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleCollapsed}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 pr-1.5 space-y-2">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</div>
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="icon" variant={mode === 'highlight' ? 'default' : 'ghost'} onClick={() => onModeChange('highlight')} className={mode === 'highlight' ? 'bg-blue-600 hover:bg-blue-700 h-8 w-8' : 'h-8 w-8'}>
              <Highlighter className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" variant={mode === 'select' ? 'default' : 'ghost'} onClick={() => onModeChange('select')} className={mode === 'select' ? 'bg-blue-600 hover:bg-blue-700 h-8 w-8' : 'h-8 w-8'}>
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" variant={mode === 'move-highlight' ? 'default' : 'ghost'} onClick={() => onModeChange('move-highlight')} disabled={!selectedHighlight} className={mode === 'move-highlight' ? 'bg-blue-600 hover:bg-blue-700 h-8 w-8' : 'h-8 w-8'}>
              <Move className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" variant={mode === 'pan' ? 'default' : 'ghost'} onClick={() => onModeChange('pan')} className={mode === 'pan' ? 'bg-blue-600 hover:bg-blue-700 h-8 w-8' : 'h-8 w-8'}>
              <Hand className="w-4 h-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={onDeleteSelectedHighlight} disabled={!selectedHighlight} title="Delete selected highlight" className={`h-8 w-8 ${selectedHighlight ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-slate-300'}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
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

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
            onClick={() => setColorPanelCollapsed((v) => !v)}
          >
            <span>Color &amp; Style</span>
            <span className="text-slate-400">{colorPanelCollapsed ? '▶' : '▼'}</span>
          </button>

          {!colorPanelCollapsed && (<>
          {/* Current color + native picker trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              title="Open color picker"
              className="w-8 h-8 rounded border-2 border-slate-900 shadow-md flex-shrink-0 transition hover:scale-110"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-xs font-mono text-slate-600">{selectedColor}</span>
            <input
              ref={colorInputRef}
              type="color"
              value={selectedColor}
              onChange={(e) => handleColorPicked(e.target.value)}
              className="sr-only"
            />
          </div>

          {/* Preset swatches */}
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Presets</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleColorPicked(hex)}
                  className={`w-6 h-6 rounded border-2 transition hover:scale-110 ${selectedColor === hex ? 'border-slate-900 shadow-md' : 'border-slate-300'}`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Star className="w-3 h-3" /> Recent
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => handleColorPicked(hex)}
                    className={`w-6 h-6 rounded border-2 transition hover:scale-110 ${selectedColor === hex ? 'border-slate-900 shadow-md' : 'border-slate-300'}`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Opacity */}
          <div className="space-y-1.5">
            <div className="text-xs text-slate-600">Opacity {Math.round(selectedOpacity * 100)}%</div>
            <input type="range" min="0.1" max="1" step="0.05" value={selectedOpacity} onChange={(e) => onOpacityChange(e.target.value)} className="w-full" />
          </div>
          </>)}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
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

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {highlightGroups.length === 0 ? (
              <p className="text-xs text-slate-500">Draw on the PDF or create a group manually to begin.</p>
            ) : (
              highlightGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onSelectGroup(group.id, group.page)}
                  className={`w-full text-left rounded-lg border p-2.5 transition ${selectedGroupId === group.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Input
                      value={group.name}
                      onChange={(e) => onRenameGroup(group.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-xs"
                    />
                    <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">Pg {group.page}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">{group.highlights.length} highlight{group.highlights.length === 1 ? '' : 's'}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Internal Name *</label>
            <Input value={clipName} onChange={(e) => onClipNameChange(e.target.value)} placeholder="e.g. Scene Close-up" className="h-8" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Formal Name</label>
            <Input value={formalName} onChange={(e) => onFormalNameChange(e.target.value)} placeholder="e.g. Photograph - Intersection Close-up" className="h-8" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Draft Exhibit #</label>
            <Input value={draftExhibitNum} onChange={(e) => onDraftExhibitNumChange(e.target.value)} placeholder="e.g. A-1a" className="h-8" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Description</label>
            <Input value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Additional notes" className="h-8" />
          </div>
        </div>
      </div>
    </aside>
  );
}