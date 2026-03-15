import React, { useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const THUMB_WIDTH = 92;
const PAGE_WIDTH = 820;

export default function ExtractClipEditor({
  fileUrl,
  currentPage,
  onPageChange,
  numPages,
  onNumPagesChange,
  highlights,
  setHighlights,
  selectedHighlight,
  setSelectedHighlight,
  mode,
  selectedColor,
  selectedOpacity,
}) {
  const pageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftRect, setDraftRect] = useState(null);
  const [startPoint, setStartPoint] = useState(null);

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

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages: pages }) => {
          onNumPagesChange?.(pages);
          if (currentPage > pages) onPageChange(1);
        }}
        loading={
          <div className="flex items-center justify-center w-full h-[620px] bg-slate-50">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        }
        className="flex w-full h-full"
      >
        <div className="flex h-[620px] overflow-hidden">
          <div className="w-[136px] bg-slate-50 border-r border-slate-200 overflow-y-auto p-3 space-y-3 shrink-0">
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
                    loading={<div className="h-[118px] bg-slate-100" />}
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
        </div>
      </Document>
    </div>
  );
}