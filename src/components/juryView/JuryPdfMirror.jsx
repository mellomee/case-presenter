import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import { normalizeHighlightGroups } from '@/components/proofVault/highlightGroupUtils';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const BASE_PAGE_WIDTH = 600;

export default function JuryPdfMirror({
  fileUrl,
  syncState,
  highlights = [],
  clippedPage = null,
  visiblePages = null,
  attorneyMarkup = null,
}) {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: BASE_PAGE_WIDTH, height: 800 });
  const [pdfDocument, setPdfDocument] = useState(null);

  const currentPage = syncState?.currentPage || (visiblePages?.length ? 1 : clippedPage || 1);
  const zoom = syncState?.zoom ?? 1;
  const panX = syncState?.panX ?? 0;
  const panY = syncState?.panY ?? 0;

  const pageNumbers = useMemo(() => {
    if (Array.isArray(visiblePages) && visiblePages.length > 0) {
      return visiblePages;
    }
    return Array.from({ length: numPages || 0 }, (_, index) => index + 1);
  }, [visiblePages, numPages]);

  const activePageNumber = pageNumbers[currentPage - 1] || clippedPage || 1;

  const activeHighlights = useMemo(
    () => normalizeHighlightGroups(highlights, clippedPage || activePageNumber)
      .filter((group) => group.page === currentPage || group.page === activePageNumber)
      .flatMap((group) =>
        group.highlights.map((highlight, index) => ({
          ...highlight,
          __groupId: group.id,
          __highlightIndex: index,
        }))
      ),
    [highlights, clippedPage, currentPage, activePageNumber]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfDocument || !activePageNumber) return;

    let cancelled = false;

    pdfDocument.getPage(activePageNumber).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1 });
      setPageSize({
        width: BASE_PAGE_WIDTH,
        height: BASE_PAGE_WIDTH * (viewport.height / viewport.width),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, activePageNumber]);

  const fitScale = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !pageSize.width || !pageSize.height) {
      return 1;
    }

    return Math.min(
      containerSize.width / pageSize.width,
      containerSize.height / pageSize.height
    );
  }, [containerSize, pageSize]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <Document
        file={fileUrl}
        onLoadSuccess={(documentProxy) => {
          setPdfDocument(documentProxy);
          setNumPages(documentProxy.numPages);
        }}
        loading={
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        }
        error={<div className="p-8 text-center text-sm text-red-400">Failed to load PDF.</div>}
        className="h-full w-full"
      >
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div style={{ transform: `scale(${fitScale})`, transformOrigin: 'center center' }}>
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: 'top center',
                userSelect: 'none',
              }}
            >
              <div className="relative shadow-2xl">
                <Page
                  pageNumber={activePageNumber}
                  width={BASE_PAGE_WIDTH}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<div className="h-[800px] w-[600px] animate-pulse rounded bg-zinc-800" />}
                />
                {activeHighlights.map((highlight) => (
                  <div
                    key={`${highlight.__groupId || 'legacy'}-${highlight.__highlightIndex ?? `${highlight.x}-${highlight.y}`}`}
                    style={{
                      position: 'absolute',
                      left: `${highlight.x}%`,
                      top: `${highlight.y}%`,
                      width: `${highlight.width}%`,
                      height: `${highlight.height}%`,
                      background: highlight.color || '#fbbf24',
                      opacity: highlight.opacity ?? 0.4,
                      pointerEvents: 'none',
                      borderRadius: '2px',
                      mixBlendMode: 'multiply',
                    }}
                  />
                ))}
                {attorneyMarkup ? (
                  <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    {(attorneyMarkup.highlights || []).map((highlight, index) => {
                      const left = Math.max(0, Math.min(1, Number(highlight.x) || 0));
                      const top = Math.max(0, Math.min(1, Number(highlight.y) || 0));
                      const width = Math.max(0, Math.min(1 - left, Number(highlight.width) || 0));
                      const height = Math.max(0, Math.min(1 - top, Number(highlight.height) || 0));
                      return (
                        <rect
                          key={highlight.id || `highlight-${index}`}
                          x={Math.round(left * 1000)}
                          y={Math.round(top * 1000)}
                          width={Math.round(width * 1000)}
                          height={Math.round(height * 1000)}
                          fill={highlight.color || '#facc15'}
                          opacity={highlight.opacity ?? 0.32}
                          rx="10"
                          ry="10"
                        />
                      );
                    })}
                    {(attorneyMarkup.strokes || []).map((stroke, index) => {
                      const points = (stroke.points || [])
                        .map((point) => `${Math.round((Math.max(0, Math.min(1, Number(point.x) || 0))) * 1000)},${Math.round((Math.max(0, Math.min(1, Number(point.y) || 0))) * 1000)}`)
                        .join(' ');

                      if (!points) return null;

                      return (
                        <polyline
                          key={stroke.id || `stroke-${index}`}
                          fill="none"
                          stroke={stroke.color || '#ef4444'}
                          strokeWidth={(stroke.width || 5) * 2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          points={points}
                        />
                      );
                    })}
                  </svg>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Document>
    </div>
  );
}