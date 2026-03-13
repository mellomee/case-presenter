import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#FEF3C7', bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { name: 'Green', hex: '#D1FAE5', bg: 'bg-green-100', border: 'border-green-300' },
  { name: 'Blue', hex: '#DBEAFE', bg: 'bg-blue-100', border: 'border-blue-300' },
  { name: 'Red', hex: '#FEE2E2', bg: 'bg-red-100', border: 'border-red-300' },
  { name: 'Purple', hex: '#EDE9FE', bg: 'bg-purple-100', border: 'border-purple-300' },
];

export default function CreateExtractClipModal({ open, onClose, parentExtract }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [clipName, setClipName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('select'); // 'draw' or 'select'
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [selectedOpacity, setSelectedOpacity] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [highlights, setHighlights] = useState([]);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [warning, setWarning] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Proof.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      resetForm();
      onClose();
    },
    onError: (error) => {
      setWarning(`Error creating clip: ${error.message}`);
    },
  });

  const resetForm = () => {
    setClipName('');
    setFormalName('');
    setDraftExhibitNum('');
    setDescription('');
    setMode('select');
    setSelectedColor(HIGHLIGHT_COLORS[0].hex);
    setSelectedOpacity(1);
    setHighlights([]);
    setSelectedHighlight(null);
    setCurrentPage(1);
    setWarning('');
  };

  const handleCanvasMouseDown = (e) => {
    if (mode !== 'draw') return;

    const rect = canvasRef.current.getBoundingClientRect();
    setStartX(e.clientX - rect.left);
    setStartY(e.clientY - rect.top);
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || mode !== 'draw') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Redraw canvas with all highlights and current preview
    redrawCanvas([
      ...highlights,
      {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
        color: selectedColor,
        opacity: selectedOpacity,
        temp: true,
      },
    ]);
  };

  const handleCanvasMouseUp = (e) => {
    if (!isDrawing || mode !== 'draw') return;
    setIsDrawing(false);

    const rect = canvasRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const newHighlight = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
      color: selectedColor,
      opacity: selectedOpacity,
    };

    if (newHighlight.width > 5 && newHighlight.height > 5) {
      setHighlights([...highlights, newHighlight]);
    }

    redrawCanvas(highlights);
  };

  const handleCanvasClick = (e) => {
    if (mode !== 'select') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (let i = highlights.length - 1; i >= 0; i--) {
      const h = highlights[i];
      if (
        clickX >= h.x &&
        clickX <= h.x + h.width &&
        clickY >= h.y &&
        clickY <= h.y + h.height
      ) {
        setSelectedHighlight(i);
        redrawCanvas(highlights, i);
        return;
      }
    }

    setSelectedHighlight(null);
    redrawCanvas(highlights);
  };

  const redrawCanvas = (highlightList, selectedIdx = null) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    highlightList.forEach((h, idx) => {
      ctx.fillStyle = h.color + Math.round(h.opacity * 255).toString(16).padStart(2, '0');
      ctx.fillRect(h.x, h.y, h.width, h.height);

      if (selectedIdx === idx) {
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x, h.y, h.width, h.height);
      }
    });
  };

  const deleteSelectedHighlight = () => {
    if (selectedHighlight === null) return;

    const newHighlights = highlights.filter((_, idx) => idx !== selectedHighlight);
    setHighlights(newHighlights);
    setSelectedHighlight(null);
    redrawCanvas(newHighlights);
  };

  const handleSubmit = async () => {
    if (!clipName.trim()) {
      setWarning('Clip Name is required');
      return;
    }
    if (!formalName.trim()) {
      setWarning('Formal Name is required');
      return;
    }

    const clipData = {
      proof_category: parentExtract.proof_category,
      file_type: 'PDF',
      proof_child_type: 'ExtractClip',
      name: clipName.trim(),
      formal_name: formalName.trim(),
      description: description.trim() || null,
      parent_proof_id: parentExtract.id,
      party_id: parentExtract.party_id || null,
      status: parentExtract.status,
      category_id: parentExtract.category_id || null,
      file_url: parentExtract.file_url,
      clipped_page: currentPage,
      highlights: highlights.length > 0 ? highlights : null,
      draft_exhibit_num: draftExhibitNum.trim() || null,
    };

    createMutation.mutate(clipData);
  };

  if (!parentExtract) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Extract Clip</DialogTitle>
        </DialogHeader>

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Parent info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                From: {parentExtract.formal_name || parentExtract.name}
              </p>
              <p className="text-xs text-blue-700 mt-1">Extract of {parentExtract.proof_category}</p>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">PDF Page</label>
            <div className="bg-slate-900 rounded-lg overflow-hidden h-96 border border-slate-200">
              <PDFViewer
                fileUrl={parentExtract.file_url}
                mode="controlled"
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>

          {/* Drawing Canvas - overlay on top of viewer */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Highlight & Annotations</label>
            <div ref={containerRef} className="relative bg-slate-100 rounded-lg border border-slate-300 h-64 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => setIsDrawing(false)}
                onClick={handleCanvasClick}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-sm">
                {mode === 'draw' ? 'Drag to highlight' : 'Click to select'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
            {/* Mode */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Mode</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('draw')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    mode === 'draw'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  🖊 Draw Highlight
                </button>
                <button
                  onClick={() => setMode('select')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    mode === 'select'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  ↖ Select Highlight
                </button>
              </div>
            </div>

            {/* Colors and Opacity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
                <div className="flex gap-2">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setSelectedColor(color.hex)}
                      className={`w-8 h-8 rounded border-2 transition ${
                        selectedColor === color.hex
                          ? 'border-slate-900 shadow-md'
                          : 'border-slate-300 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Opacity: {Math.round(selectedOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={selectedOpacity}
                  onChange={(e) => setSelectedOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Delete selected */}
            {selectedHighlight !== null && (
              <button
                onClick={deleteSelectedHighlight}
                className="w-full px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected Highlight
              </button>
            )}

            {/* Highlight count */}
            <p className="text-xs text-slate-600">
              {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} on page {currentPage}
            </p>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Clip Name (Internal) *</label>
              <Input
                placeholder="e.g. Scene Close-up"
                value={clipName}
                onChange={(e) => setClipName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Draft Exhibit # (optional)</label>
              <Input
                placeholder="e.g. A-1a"
                value={draftExhibitNum}
                onChange={(e) => setDraftExhibitNum(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Formal Name *</label>
            <Input
              placeholder="e.g. Photograph - Intersection Close-up"
              value={formalName}
              onChange={(e) => setFormalName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Description (optional)</label>
            <Input
              placeholder="Additional notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? 'Creating...' : 'Save Extract Clip'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}