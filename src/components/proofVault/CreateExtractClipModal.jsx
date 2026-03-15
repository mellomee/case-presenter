import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Trash2, Highlighter, MousePointer2, Hand, Move } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';

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
  const [highlights, setHighlights] = useState([]);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightPage, setHighlightPage] = useState(null);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const [warning, setWarning] = useState('');
  const [showPageWarning, setShowPageWarning] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const actualParentExtract = isEditing
    ? proofs.find((proof) => proof.id === parentExtract?.parent_proof_id) || parentExtract
    : parentExtract;

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
    setHighlights([]);
    setSelectedHighlight(null);
    setCurrentPage(1);
    setHighlightPage(null);
    setDraftHighlight(null);
    setWarning('');
    setShowPageWarning(false);
    setPendingPage(null);
  };

  useEffect(() => {
    if (!open || !parentExtract) return;

    if (isEditing) {
      setClipName(parentExtract.name || '');
      setFormalName(parentExtract.formal_name || '');
      setDraftExhibitNum(parentExtract.draft_exhibit_num || '');
      setDescription(parentExtract.description || '');
      setMode('highlight');
      setSelectedColor(HIGHLIGHT_COLORS[0].hex);
      setSelectedOpacity(0.45);
      setHighlights(Array.isArray(parentExtract.highlights) ? parentExtract.highlights : []);
      setSelectedHighlight(null);
      setCurrentPage(parentExtract.clipped_page || 1);
      setHighlightPage(parentExtract.clipped_page || 1);
      setDraftHighlight(null);
      setWarning('');
      setShowPageWarning(false);
      setPendingPage(null);
      return;
    }

    resetForm();
  }, [open, parentExtract, isEditing]);

  const requestPageChange = (nextPage) => {
    if (highlights.length > 0 && highlightPage && nextPage !== highlightPage) {
      setPendingPage(nextPage);
      setShowPageWarning(true);
      return;
    }
    setCurrentPage(nextPage);
    setSelectedHighlight(null);
  };

  const confirmSwitchPage = () => {
    setHighlights([]);
    setSelectedHighlight(null);
    setHighlightPage(null);
    if (pendingPage) {
      setCurrentPage(pendingPage);
    }
    setPendingPage(null);
    setShowPageWarning(false);
  };

  const cancelSwitchPage = () => {
    setPendingPage(null);
    setShowPageWarning(false);
  };

  const getPoint = (event) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  };

  const handleOverlayMouseDown = (event) => {
    const point = getPoint(event);
    if (!point) return;

    if (mode === 'move-highlight') {
      if (selectedHighlight === null || !highlights[selectedHighlight]) return;
      moveHighlightRef.current = {
        startPoint: point,
        startHighlight: { ...highlights[selectedHighlight] },
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

    if (mode === 'move-highlight' && moveHighlightRef.current && selectedHighlight !== null) {
      const { startPoint, startHighlight } = moveHighlightRef.current;
      const nextX = clamp(startHighlight.x + (point.x - startPoint.x), 0, 100 - startHighlight.width);
      const nextY = clamp(startHighlight.y + (point.y - startPoint.y), 0, 100 - startHighlight.height);

      setHighlights((prev) =>
        prev.map((highlight, idx) =>
          idx === selectedHighlight ? { ...highlight, x: nextX, y: nextY } : highlight
        )
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

    if (mode !== 'highlight' || !dragStartRef.current || !draftHighlight) return;

    if (draftHighlight.width > 0.8 && draftHighlight.height > 0.8) {
      setHighlights((prev) => [...prev, draftHighlight]);
      setHighlightPage(currentPage);
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
    if (selectedHighlight === null) return;
    const nextHighlights = highlights.filter((_, idx) => idx !== selectedHighlight);
    setHighlights(nextHighlights);
    setSelectedHighlight(null);
    if (nextHighlights.length === 0) {
      setHighlightPage(null);
    }
  };

  const handleOpacityChange = (value) => {
    const nextOpacity = parseFloat(value);
    setSelectedOpacity(nextOpacity);

    if (selectedHighlight !== null) {
      setHighlights((prev) =>
        prev.map((highlight, idx) =>
          idx === selectedHighlight ? { ...highlight, opacity: nextOpacity } : highlight
        )
      );
    }
  };

  const handleSubmit = () => {
    if (!clipName.trim()) {
      setWarning('Clip Name is required');
      return;
    }
    if (!formalName.trim()) {
      setWarning('Formal Name is required');
      return;
    }
    if (highlights.length === 0) {
      setWarning('Add at least one highlight');
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
      file_url: actualParentExtract.file_url,
      clipped_page: highlightPage || currentPage,
      highlights,
      draft_exhibit_num: draftExhibitNum.trim() || null,
    };

    saveMutation.mutate(clipData);
  };

  if (!parentExtract || !actualParentExtract) return null;

  const overlayHighlights = currentPage === highlightPage ? highlights : [];

  const pageOverlay = (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-20 ${mode === 'pan' ? 'pointer-events-none' : 'pointer-events-auto'} ${mode === 'highlight' ? 'cursor-crosshair' : mode === 'select' ? 'cursor-pointer' : mode === 'move-highlight' ? 'cursor-move' : 'cursor-default'}`}
      style={{ cursor: mode === 'highlight' ? 'crosshair' : mode === 'select' ? 'pointer' : mode === 'move-highlight' ? 'move' : 'default' }}
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
      {overlayHighlights.map((highlight, idx) => (
        <button
          key={idx}
          type="button"
          className={`absolute rounded-sm ${mode === 'select' ? 'cursor-pointer' : 'pointer-events-none'} ${selectedHighlight === idx ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
          style={{
            left: `${highlight.x}%`,
            top: `${highlight.y}%`,
            width: `${highlight.width}%`,
            height: `${highlight.height}%`,
            background: highlight.color,
            opacity: highlight.opacity,
            mixBlendMode: 'multiply',
            cursor: mode === 'select' ? 'pointer' : 'crosshair',
          }}
          onClick={(event) => {
            if (mode !== 'select') return;
            event.stopPropagation();
            setSelectedHighlight(idx);
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
              <p className="text-xs text-blue-700 mt-1">Extract of {actualParentExtract.proof_category}</p>
            </div>
          </div>

          <div>
            <div className="bg-slate-900 rounded-lg overflow-hidden h-[70vh] border border-slate-200">
              <PDFViewer
                fileUrl={actualParentExtract.file_url}
                mode="controller"
                currentPage={currentPage}
                onPageChange={requestPageChange}
                allowPan={mode === 'pan'}
                pageOverlay={pageOverlay}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-3">
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 text-xs">
              <div className="text-slate-500 shrink-0 mr-1 whitespace-nowrap">
                {highlightPage ? `Highlights on page ${highlightPage}.` : 'No highlights placed yet.'}
              </div>

              <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shrink-0">
                <Button type="button" size="icon" variant={mode === 'highlight' ? 'default' : 'ghost'} onClick={() => setMode('highlight')} className={mode === 'highlight' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'} title="Highlight" aria-label="Highlight">
                  <Highlighter className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant={mode === 'select' ? 'default' : 'ghost'} onClick={() => setMode('select')} className={mode === 'select' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'} title="Select" aria-label="Select">
                  <MousePointer2 className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant={mode === 'move-highlight' ? 'default' : 'ghost'} onClick={() => setMode('move-highlight')} disabled={selectedHighlight === null} className={mode === 'move-highlight' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'} title="Move selected highlight" aria-label="Move selected highlight">
                  <Move className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant={mode === 'pan' ? 'default' : 'ghost'} onClick={() => setMode('pan')} className={mode === 'pan' ? 'bg-blue-600 hover:bg-blue-700 h-7 w-7' : 'h-7 w-7'} title="Move PDF" aria-label="Move PDF">
                  <Hand className="w-4 h-4" />
                </Button>
                {selectedHighlight !== null && (
                  <Button type="button" size="icon" variant="ghost" onClick={deleteSelectedHighlight} className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete selected highlight" aria-label="Delete selected highlight">
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
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={selectedOpacity}
                  onChange={(e) => handleOpacityChange(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="text-slate-500 shrink-0 whitespace-nowrap">
                {mode === 'highlight'
                  ? 'Drag on PDF to draw'
                  : mode === 'select'
                    ? 'Click highlight to select'
                    : mode === 'move-highlight'
                      ? 'Drag selected highlight to move'
                      : 'Pan with PDF controls'}
              </div>


            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Internal Name *</label>
                <Input value={clipName} onChange={(e) => setClipName(e.target.value)} placeholder="e.g. Scene Close-up" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Formal Name *</label>
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
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Save Extract Clip')}
            </Button>
          </div>
        </div>

        <AlertDialog open={showPageWarning} onOpenChange={setShowPageWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move highlights to another page?</AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">
                Highlights can only live on one page. Proceeding will remove highlights from page {highlightPage} so you can create new highlights on page {pendingPage}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={cancelSwitchPage}>No</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSwitchPage}>Yes, remove old highlights</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}