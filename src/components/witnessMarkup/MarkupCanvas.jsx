import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Loader2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const VIEWBOX_SIZE = 1000;
const DEFAULT_STROKE_WIDTH = 6;

function normalizePoint(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}

function clampRect(start, end, color) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    id: `highlight-${Date.now()}`,
    x,
    y,
    width,
    height,
    color,
    opacity: 0.32,
  };
}

function toViewBox(value) {
  return Math.round(value * VIEWBOX_SIZE);
}

export default function MarkupCanvas({
  fileUrl,
  pageNumber,
  tool,
  penColor,
  highlightColor,
  strokes,
  highlights,
  onAddStroke,
  onAddHighlight,
  onLoadDocument,
  captureRef,
}) {
  const isTouchNavigationMode = tool === 'navigate';
  const wrapperRef = useRef(null);
  const stageRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 900 });
  const [pageAspectRatio, setPageAspectRatio] = useState(11 / 8.5);
  const [draftStroke, setDraftStroke] = useState(null);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const [highlightStart, setHighlightStart] = useState(null);

  const pageWidth = Math.max(
    240,
    Math.min(
      Math.max(240, containerSize.width - 24),
      Math.max(240, (containerSize.height - 24) / pageAspectRatio)
    )
  );

  useEffect(() => {
    if (captureRef) {
      captureRef.current = stageRef.current;
    }
  });

  useEffect(() => {
    const updateSize = () => {
      setContainerSize({
        width: wrapperRef.current?.clientWidth || 900,
        height: wrapperRef.current?.clientHeight || 900,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const finishStroke = () => {
    if (draftStroke?.points?.length > 1) {
      onAddStroke?.(draftStroke);
    }
    setDraftStroke(null);
  };

  const finishHighlight = () => {
    if (draftHighlight && draftHighlight.width > 0.003 && draftHighlight.height > 0.003) {
      onAddHighlight?.(draftHighlight);
    }
    setDraftHighlight(null);
    setHighlightStart(null);
  };

  const handlePointerDown = (event) => {
    if (!stageRef.current || isTouchNavigationMode) return;
    const point = normalizePoint(event, stageRef.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (tool === 'pen') {
      setDraftStroke({
        id: `stroke-${Date.now()}`,
        color: penColor,
        width: DEFAULT_STROKE_WIDTH,
        points: [point],
      });
      return;
    }

    if (tool === 'highlight') {
      setHighlightStart(point);
      setDraftHighlight(clampRect(point, point, highlightColor));
    }
  };

  const handlePointerMove = (event) => {
    if (!stageRef.current || isTouchNavigationMode) return;
    const point = normalizePoint(event, stageRef.current);

    if (tool === 'pen' && draftStroke) {
      setDraftStroke((current) => ({
        ...current,
        points: [...current.points, point],
      }));
      return;
    }

    if (tool === 'highlight' && highlightStart) {
      setDraftHighlight(clampRect(highlightStart, point, highlightColor));
    }
  };

  const renderStroke = (stroke) => (
    <polyline
      key={stroke.id}
      fill="none"
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      points={stroke.points.map((point) => `${toViewBox(point.x)},${toViewBox(point.y)}`).join(' ')}
    />
  );

  const renderHighlight = (highlight) => (
    <rect
      key={highlight.id}
      x={toViewBox(highlight.x)}
      y={toViewBox(highlight.y)}
      width={toViewBox(highlight.width)}
      height={toViewBox(highlight.height)}
      fill={highlight.color}
      opacity={highlight.opacity ?? 0.32}
      rx="10"
      ry="10"
    />
  );

  if (!fileUrl) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-500">
        <div className="text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-medium">No PDF available for markup.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="h-[calc(100vh-17rem)] w-full overflow-auto overscroll-contain rounded-2xl border border-slate-200 bg-slate-100 p-3 md:h-[calc(100vh-15rem)]" style={isTouchNavigationMode ? { touchAction: 'auto' } : { touchAction: 'none' }}>
      <div className="flex h-full items-center justify-center overflow-visible">
        <div ref={stageRef} className={`relative inline-block max-w-none select-none rounded-xl bg-white shadow-sm ${isTouchNavigationMode ? 'overflow-visible' : 'overflow-hidden'}`}>
          <Document
            file={fileUrl}
            loading={<div className="flex h-[70vh] w-full items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}
            error={<div className="flex h-[70vh] w-full items-center justify-center bg-white text-sm text-red-600">Unable to load PDF.</div>}
            onLoadSuccess={({ numPages }) => onLoadDocument?.(numPages)}
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onLoadSuccess={(page) => {
                const viewport = page.getViewport({ scale: 1 });
                setPageAspectRatio(viewport.height / viewport.width);
              }}
              loading={<div className="flex h-[70vh] w-full items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}
            />
          </Document>

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} preserveAspectRatio="none">
          {highlights.map(renderHighlight)}
          {draftHighlight ? renderHighlight(draftHighlight) : null}
          {strokes.map(renderStroke)}
          {draftStroke ? renderStroke(draftStroke) : null}
        </svg>

          <div
            className={`absolute inset-0 ${isTouchNavigationMode ? 'pointer-events-none cursor-grab' : 'cursor-crosshair'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={tool === 'pen' ? finishStroke : finishHighlight}
            onPointerLeave={tool === 'pen' ? finishStroke : finishHighlight}
          />
        </div>
      </div>
    </div>
  );
}