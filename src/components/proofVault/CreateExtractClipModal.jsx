import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Trash2, Highlighter, MousePointer2, Hand, Move, Plus, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { parsePageRange } from './pageRangeUtils';
import {
  createHighlightGroup,
  flattenHighlightGroupsForPage,
  getInitialHighlightPage,
  normalizeHighlightGroups,
} from './highlightGroupUtils';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#FEF3C7' },
  { name: 'Green', hex: '#D1FAE5' },
  { name: 'Blue', hex: '#DBEAFE' },
  { name: 'Red', hex: '#FEE2E2' },
  { name: 'Purple', hex: '#EDE9FE' },
];

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function isValidHighlight(highlight) {
  return Number.isFinite(highlight?.x)
    && Number.isFinite(highlight?.y)
    && Number.isFinite(highlight?.width)
    && Number.isFinite(highlight?.height)
    && highlight.width > 0
    && highlight.height > 0;
}

export default function CreateExtractClipModal({ open, onClose, parentExtract, onSuccess }) {
  const queryClient = useQueryClient();
  const overlayRef = useRef(null);
  const dragStartRef = useRef(null);
  const moveHighlightRef = useRef(null);
  const isEditing = parentExtract?.proof_child_type === 'ExtractClip';

  const [clipName, setClipName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('highlight');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [selectedOpacity, setSelectedOpacity] = useState(0.45);
  const [highlightGroups, setHighlightGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const [warning, setWarning] = useState('');

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const actualParentExtract = isEditing
    ? proofs.find((proof) => proof.id === parentExtract?.parent_proof_id) || parentExtract
    : parentExtract;

  const { url: resolvedParentUrl, isLoading: isResolvingParentUrl } = useResolvedProofAsset(actualParentExtract);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        return base44.entities.Proof.update(parentExtract.id, data);
      }
      return base44.entities.Proof.create(data);
    },
    onSuccess: (savedProof) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      onSuccess?.(savedProof);
      resetForm();
      onClose();
    },
    onError: (error) => {
      setWarning(`Error ${isEditing ? 'saving' : 'creating'} clip: ${error.message}`);
    },
  });

  const resetForm = () => {
    setClipName('');
    setFormalName('');
    setDraftExhibitNum('');
    setDescription('');
    setMode('highlight');
    setSelectedColor(HIGHLIGHT_COLORS[0].hex);
    setSelectedOpacity(0.45);
    setHighlightGroups([]);
    setSelectedGroupId(null);
    setSelectedHighlight(null);
    setCurrentPage(1);
    setDraftHighlight(null);
    setWarning('');
  };

  useEffect(() => {
    if (!open || !parentExtract) return;

    if (isEditing) {
      const normalizedGroups = normalizeHighlightGroups(parentExtract.highlights, parentExtract.clipped_page || 1);
      setClipName(parentExtract.name || '');
      setFormalName(parentExtract.formal_name || '');
      setDraftExhibitNum(parentExtract.draft_exhibit_num || '');
      setDescription(parentExtract.description || '');
      setMode('highlight');
      setSelectedColor(HIGHLIGHT_COLORS[0].hex);
      setSelectedOpacity(0.45);
      setHighlightGroups(normalizedGroups);
      setSelectedGroupId(normalizedGroups[0]?.id || null);
      setSelectedHighlight(null);
      setCurrentPage(getInitialHighlightPage(parentExtract.highlights, parentExtract.clipped_page || 1));
      setDraftHighlight(null);
      setWarning('');
      return;
    }

    resetForm();
  }, [open, parentExtract, isEditing]);

  const visibleExtractPages = useMemo(
    () => parsePageRange(actualParentExtract?.extract_pages || ''),
    [actualParentExtract?.extract_pages]
  );

  const groupsOnCurrentPage = useMemo(
    () => highlightGroups.filter((group) => group.page === currentPage),
    [highlightGroups, currentPage]
  );

  const overlayHighlights = useMemo(
    () => flattenHighlightGroupsForPage(highlightGroups, currentPage, currentPage),
    [highlightGroups, currentPage]
  );

  const selectedGroup = highlightGroups.find((group) => group.id === selectedGroupId) || null;

  const getPoint = (event) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  };

  const createGroupForCurrentPage = (withHighlight = null) => {
    const nextGroup = createHighlightGroup(currentPage, highlightGroups.length);
    const completeGroup = {
      ...nextGroup,
      highlights: withHighlight ? [withHighlight] : [],
    };
    setHighlightGroups((prev) => [...prev, completeGroup]);
    setSelectedGroupId(completeGroup.id);
    return completeGroup;
  };

  const handleOverlayMouseDown = (event) => {
    const point = getPoint(event);
    if (!point) return;

    if (mode === 'move-highlight') {
      if (!selectedHighlight) return;
      const targetHighlight = overlayHighlights.find(
        (highlight) => highlight.__groupId === selectedHighlight.groupId && highlight.__highlightIndex === selectedHighlight.highlightIndex
      );
      if (!targetHighlight) return;
      moveHighlightRef.current = {
        startPoint: point,
        startHighlight: { ...targetHighlight },
      };
      return;
    }

    if (mode !== 'highlight') return;
    dragStartRef.current = point;
    setDraftHighlight({ x: point.x, y: point.y, width: 0, height: 0, color: selectedColor, opacity: selectedOpacity });
    setSelectedHighlight(null);
  };

  const handleOverlayMouseMove = (event) => {
    const point = getPoint(event);
    if (!point) return;

    if (mode === 'move-highlight' && moveHighlightRef.current && selectedHighlight) {
      const { startPoint, startHighlight } = moveHighlightRef.current;
      const nextX = clamp(startHighlight.x + (point.x - startPoint.x), 0, 100 - startHighlight.width);
      const nextY = clamp(startHighlight.y + (point.y - startPoint.y), 0, 100 - startHighlight.height);

      setHighlightGroups((prev) =>
        prev.map((group) => {
          if (group.id !== selectedHighlight.groupId) return group;
          return {
            ...group,
            highlights: group.highlights.map((highlight, index) =>
              index === selectedHighlight.highlightIndex ? { ...highlight, x: nextX, y: nextY } : highlight
            ),
          };
        })
      );
      return;
    }

    if (mode !== 'highlight' || !dragStartRef.current) return;

    const start = dragStartRef.current;
    setDraftHighlight({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
      color: selectedColor,
      opacity: selectedOpacity,
    });
  };

  const handleOverlayMouseUp = () => {
    if (mode === 'move-highlight') {
      moveHighlightRef.current = null;
      return;
    }

    const nextHighlight = draftHighlight;
    if (mode !== 'highlight' || !dragStartRef.current || !nextHighlight) return;

    if (isValidHighlight(nextHighlight) && nextHighlight.width > 0.8 && nextHighlight.height > 0.8) {
      if (selectedGroup && selectedGroup.page === currentPage) {
        setHighlightGroups((prev) =>
          prev.map((group) =>
            group.id === selectedGroup.id
              ? { ...group, highlights: [...group.highlights, nextHighlight] }
              : group
          )
        );
        setSelectedGroupId(selectedGroup.id);
      } else {
        const targetGroup = createGroupForCurrentPage(nextHighlight);
        setSelectedGroupId(targetGroup.id);
      }
    }

    dragStartRef.current = null;
    setDraftHighlight(null);
  };

  const clearDraft = () => {
    dragStartRef.current = null;
    moveHighlightRef.current = null;
    setDraftHighlight(null);
  };

  const deleteSelectedHighlight = () => {
    if (!selectedHighlight) return;
    setHighlightGroups((prev) =>
      prev
        .map((group) => {
          if (group.id !== selectedHighlight.groupId) return group;
          return {
            ...group,
            highlights: group.highlights.filter((_, index) => index !== selectedHighlight.highlightIndex),
          };
        })
        .filter((group) => group.highlights.length > 0)
    );
    setSelectedHighlight(null);
  };

  const deleteSelectedGroup = () => {
    if (!selectedGroupId) return;
    const remainingGroups = highlightGroups.filter((group) => group.id !== selectedGroupId);
    setHighlightGroups(remainingGroups);
    setSelectedGroupId(remainingGroups[0]?.id || null);
    setSelectedHighlight(null);
  };

  const handleOpacityChange = (value) => {
    const nextOpacity = parseFloat(value);
    setSelectedOpacity(nextOpacity);

    if (!selectedHighlight) return;

    setHighlightGroups((prev) =>
      prev.map((group) => {
        if (group.id !== selectedHighlight.groupId) return group;
        return {
          ...group,
          highlights: group.highlights.map((highlight, index) =>
            index === selectedHighlight.highlightIndex ? { ...highlight, opacity: nextOpacity } : highlight
          ),
        };
      })
    );
  };

  const handleSubmit = () => {
    if (!clipName.trim()) {
      setWarning('Clip Name is required');
      return;
    }
    const cleanedGroups = highlightGroups
      .map((group) => ({
        ...group,
        highlights: group.highlights.filter(isValidHighlight),
      }))
      .filter((group) => group.highlights.length > 0);
    if (cleanedGroups.length === 0) {
      setWarning('Add at least one highlight group');
      return;
    }

    const clipData = {
      proof_category: actualParentExtract.proof_category,
      file_type: 'PDF',
      proof_child_type: 'ExtractClip',
      name: clipName.trim(),
      formal_name: formalName.trim(),
      description: description.trim() || null,
      parent_proof_id: isEditing ? parentExtract.parent_proof_id : actualParentExtract.id,
      party_id: actualParentExtract.party_id || null,
      status: actualParentExtract.status,
      category_id: actualParentExtract.category_id || null,
      proof_type_category_id: actualParentExtract.proof_type_category_id,
      file_source: actualParentExtract.file_source || 'base44',
      file_url: actualParentExtract.file_url || '',
      dropbox_file_id: actualParentExtract.dropbox_file_id || '',
      dropbox_path: actualParentExtract.dropbox_path || '',
      dropbox_file_name: actualParentExtract.dropbox_file_name || '',
      clipped_page: cleanedGroups[0].page,
      highlights: cleanedGroups,
      draft_exhibit_num: draftExhibitNum.trim() || null,
    };

    saveMutation.mutate(clipData);
  };

  if (!parentExtract || !actualParentExtract) return null;

  const pageOverlay = (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-20 ${mode === 'pan' ? 'pointer-events-none' : 'pointer-events-auto'} ${mode === 'highlight' ? 'cursor-crosshair' : mode === 'select' ? 'cursor-pointer' : mode === 'move-highlight' ? 'cursor-move' : 'cursor-default'}`}
      onMouseDown={handleOverlayMouseDown}
      onMouseMove={handleOverlayMouseMove}
      onMouseUp={handleOverlayMouseUp}
      onMouseLeave={clearDraft}
      onClick={(event) => {
        if (mode === 'select' && event.target === event.currentTarget) {
          setSelectedHighlight(null);
        }
      }}
    >
      {overlayHighlights.map((highlight) => (
        <button
          key={`${highlight.__groupId}-${highlight.__highlightIndex}`}
          type="button"
          className={`absolute rounded-sm ${mode === 'select' ? 'cursor-pointer' : 'pointer-events-none'} ${selectedHighlight?.groupId === highlight.__groupId && selectedHighlight?.highlightIndex === highlight.__highlightIndex ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
          style={{
            left: `${highlight.x}%`,
            top: `${highlight.y}%`,
            width: `${highlight.width}%`,
            height: `${highlight.height}%`,
            background: highlight.color,
            opacity: highlight.opacity,
            mixBlendMode: 'multiply',
          }}
          onClick={(event) => {
            if (mode !== 'select') return;
            event.stopPropagation();
            setSelectedGroupId(highlight.__groupId);
            setSelectedHighlight({ groupId: highlight.__groupId, highlightIndex: highlight.__highlightIndex });
            setSelectedOpacity(highlight.opacity ?? 0.45);
          }}
        />
      ))}
      {draftHighlight && (
        <div
          className="absolute rounded-sm pointer-events-none"
          style={{
            left: `${draftHighlight.x}%`,
            top: `${draftHighlight.y}%`,
            width: `${draftHighlight.width}%`,
            height: `${draftHighlight.height}%`,
            background: draftHighlight.color,
            opacity: draftHighlight.opacity,
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Extract Clip' : 'Create Extract Clip'}</DialogTitle>
        </DialogHeader>

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {isEditing ? `Editing: ${parentExtract.formal_name || parentExtract.name}` : `From: ${actualParentExtract.formal_name || actualParentExtract.name}`}
              </p>
              <p className="text-xs text-blue-700 mt-1">Grouped highlights can span multiple pages in the same clip.</p>
            </div>
          </div>

          {isResolvingParentUrl ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading extract PDF...
            </div>
          ) : (
            <div className="bg-slate-900 rounded-lg overflow-hidden h-[70vh] border border-slate-200">
              <PDFViewer
                fileUrl={resolvedParentUrl}
                mode="controller"
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                allowPan={mode === 'pan'}
                pageOverlay={pageOverlay}
                visiblePages={visibleExtractPages.length > 0 ? visibleExtractPages : null}
              />
            </div>
          )}

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-4">
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 text-xs">
              <div className="text-slate-500 shrink-0 mr-1 whitespace-nowrap">
                {groupsOnCurrentPage.length > 0 ? `${groupsOnCurrentPage.length} group${groupsOnCurrentPage.length === 1 ? '' : 's'} on page ${currentPage}.` : `No groups on page ${currentPage} yet.`}
              </div>

              <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shrink-0">
                <Button type="button" size="icon" variant={mode === 'highlight' ? 'default' : 'ghost'} onClick={() => setMode('highlight')} className={mode === 'highlight' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'}>
                  <Highlighter className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant={mode === 'select' ? 'default' : 'ghost'} onClick={() => setMode('select')} className={mode === 'select' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'}>
                  <MousePointer2 className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant={mode === 'move-highlight' ? 'default' : 'ghost'} onClick={() => setMode('move-highlight')} disabled={!selectedHighlight} className={mode === 'move-highlight' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'}>
                  <Move className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant={mode === 'pan' ? 'default' : 'ghost'} onClick={() => setMode('pan')} className={mode === 'pan' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'}>
                  <Hand className="w-4 h-4" />
                </Button>
                {selectedHighlight && (
                  <Button type="button" size="icon" variant="ghost" onClick={deleteSelectedHighlight} className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setSelectedColor(color.hex)}
                    className={`w-7 h-7 rounded border-2 transition ${selectedColor === color.hex ? 'border-slate-900 shadow-md' : 'border-slate-300 hover:border-slate-500'}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 min-w-[170px] flex-1 xl:max-w-[260px]">
                <span className="text-slate-600 whitespace-nowrap">Opacity {Math.round(selectedOpacity * 100)}%</span>
                <input type="range" min="0.1" max="1" step="0.05" value={selectedOpacity} onChange={(e) => handleOpacityChange(e.target.value)} className="w-full" />
              </div>

              <div className="text-slate-500 shrink-0 whitespace-nowrap">
                {mode === 'highlight'
                  ? 'Draw to add to the selected group, or start a new one on this page.'
                  : mode === 'select'
                    ? 'Click a highlight to select it.'
                    : mode === 'move-highlight'
                      ? 'Drag the selected highlight to reposition it.'
                      : 'Pan the PDF with the viewer controls.'}
              </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Internal Name *</label>
                  <Input value={clipName} onChange={(e) => setClipName(e.target.value)} placeholder="e.g. Scene Close-up" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Formal Name</label>
                  <Input value={formalName} onChange={(e) => setFormalName(e.target.value)} placeholder="e.g. Photograph - Intersection Close-up" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Draft Exhibit #</label>
                  <Input value={draftExhibitNum} onChange={(e) => setDraftExhibitNum(e.target.value)} placeholder="e.g. A-1a" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Description</label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional notes" />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Highlight Groups</h4>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => createGroupForCurrentPage()} className="gap-2">
                      <Plus className="w-4 h-4" /> New Group
                    </Button>
                    {selectedGroupId && (
                      <Button type="button" size="sm" variant="ghost" onClick={deleteSelectedGroup} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {highlightGroups.length === 0 ? (
                    <p className="text-xs text-slate-500">Draw on the PDF or create a group manually to begin.</p>
                  ) : (
                    highlightGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setCurrentPage(group.page);
                          setSelectedHighlight(null);
                        }}
                        className={`w-full text-left rounded-lg border p-3 transition ${selectedGroupId === group.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Input
                            value={group.name}
                            onChange={(e) => {
                              const nextName = e.target.value;
                              setHighlightGroups((prev) => prev.map((item) => item.id === group.id ? { ...item, name: nextName } : item));
                            }}
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
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Save Extract Clip')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}