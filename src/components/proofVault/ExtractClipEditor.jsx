import React, { useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const THUMB_WIDTH = 88;
const PAGE_WIDTH = 820;

export default function ExtractClipEditor({
  fileUrl,
  currentPage,
  onPageChange,
  highlights,
  setHighlights,
  selectedHighlight,
  setSelectedHighlight,
  mode,
  setMode,
  selectedColor,
  setSelectedColor,
  selectedOpacity,
  setSelectedOpacity,
}) {
  const pageRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftRect, setDraftRect] = useState(null);
  const [startPoint, setStartPoint] = useState(null);

  const colors = useMemo(() => [
    { name: 'Yellow', hex: '#FDE68A' },
    { name: 'Green', hex: '#86EFAC' },
    { name: 'Blue', hex: '#93C5FD' },
    { name: 'Pink', hex: '#F9A8D4' },
    { name: 'Red', hex: '#FCA5A5' },
    { name: 'Purple', hex: '#C4B5FD' },
  ], []);

  const getRelativePoint = (event) => {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const handlePointerDown = (event) => {
    if (mode !== 'draw') return;
    const point = getRelativePoint(event);
    if (!point) return;
    setStartPoint(point);
    setDraftRect({ x: point.x, y: point.y, width: 0, height: 0 });
    setIsDrawing(true);
    setSelectedHighlight(null);
  };

  const handlePointerMove = (event) => {
    if (!isDrawing || mode !== 'draw' || !startPoint) return;
    const point = getRelativePoint(event);
    if (!point) return;

    setDraftRect({
      x: Math.min(startPoint.x, point.x),
      y: Math.min(startPoint.y, point.y),
      width: Math.abs(point.x - startPoint.x),
      height: Math.abs(point.y - startPoint.y),
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !draftRect) return;

    if (draftRect.width > 1 && draftRect.height > 1) {
      setHighlights([
        ...highlights,
        {
          x: draftRect.x,
          y: draftRect.y,
          width: draftRect.width,
          height: draftRect.height,
          color: selectedColor,
          opacity: selectedOpacity,
        },
      ]);
    }

    setIsDrawing(false);
    setDraftRect(null);
    setStartPoint(null);
  };

  const deleteSelectedHighlight = () => {
    if (selectedHighlight === null) return;
    setHighlights(highlights.filter((_, idx) => idx !== selectedHighlight));
    setSelectedHighlight(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="flex h-[72vh] min-h-[680px] overflow-hidden">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: pages }) => {
            setNumPages(pages);
            if (currentPage > pages) onPageChange(1);
          }}
          loading={
            <div className="flex items-center justify-center w-full h-full bg-slate-50">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          }
          className="flex w-full h-full"
        >
          <div className="w-[132px] bg-slate-50 border-r border-slate-200 overflow-y-auto p-3 space-y-3 shrink-0">
            {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`w-full rounded-lg border p-2 transition ${
                  currentPage === pageNumber
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                  <Page
                    pageNumber={pageNumber}
                    width={THUMB_WIDTH}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    loading={<div className="h-[114px] bg-slate-100" />}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-slate-600 text-center">Page {pageNumber}</div>
              </button>
            ))}
          </div>

          <div className="flex-1 bg-slate-100 overflow-auto p-5">
            <div className="min-w-fit flex justify-center">
              <div
                ref={pageRef}
                className={`relative bg-white shadow-sm border border-slate-200 ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-pointer'}`}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={() => {
                  if (isDrawing) handlePointerUp();
                }}
                onClick={() => {
                  if (mode === 'select') setSelectedHighlight(null);
                }}
              >
                <Page
                  pageNumber={currentPage}
                  width={PAGE_WIDTH}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                  loading={<div className="w-[820px] h-[1060px] bg-slate-100 animate-pulse" />}
                />

                <div className="absolute inset-0">
                  {highlights.map((highlight, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (mode === 'select') setSelectedHighlight(idx);
                      }}
                      className={`absolute rounded-sm ${mode === 'select' ? 'cursor-pointer' : 'pointer-events-none'} ${selectedHighlight === idx ? 'ring-2 ring-slate-900' : ''}`}
                      style={{
                        left: `${highlight.x}%`,
                        top: `${highlight.y}%`,
                        width: `${highlight.width}%`,
                        height: `${highlight.height}%`,
                        backgroundColor: highlight.color,
                        opacity: highlight.opacity,
                      }}
                    />
                  ))}

                  {draftRect && (
                    <div
                      className="absolute rounded-sm border-2 border-blue-500 bg-blue-200/30"
                      style={{
                        left: `${draftRect.x}%`,
                        top: `${draftRect.y}%`,
                        width: `${draftRect.width}%`,
                        height: `${draftRect.height}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </Document>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="h-9 w-9 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4 mx-auto" />
            </button>
            <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 min-w-[88px] text-center">
              {currentPage}/{numPages || 1}
            </div>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(numPages || 1, currentPage + 1))}
              className="h-9 w-9 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={!numPages || currentPage >= numPages}
            >
              <ChevronRight className="w-4 h-4 mx-auto" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'draw' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Draw
            </button>
            <button
              type="button"
              onClick={() => setMode('select')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'select' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Select
            </button>
            <div className="flex items-center gap-2 px-1">
              {colors.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  title={color.name}
                  onClick={() => setSelectedColor(color.hex)}
                  className={`h-7 w-7 rounded-full border-2 ${selectedColor === color.hex ? 'border-slate-900 scale-110' : 'border-white'} transition`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 min-w-[170px]">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={selectedOpacity}
                onChange={(e) => setSelectedOpacity(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-slate-600 w-10">{Math.round(selectedOpacity * 100)}%</span>
            </div>
            <button
              type="button"
              onClick={deleteSelectedHighlight}
              disabled={selectedHighlight === null}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}