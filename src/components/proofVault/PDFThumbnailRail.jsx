import React, { useRef, useEffect } from 'react';
import { Page } from 'react-pdf';

/**
 * Standalone thumbnail rail — rendered completely outside of any react-pdf Document component.
 * Receives `pageNumbers` (array of actual PDF page numbers to render) and the parent Document's
 * loaded state via the `pdfFile` prop so we can reuse the already-loaded document object.
 *
 * This component owns its own scroll container independently of the main viewer.
 */
export default function PDFThumbnailRail({
  pageNumbers = [],
  currentPage,
  onPageClick,
  thumbnailWidth = 62,
  selectableThumbnails = false,
  selectedPages = [],
  hasOriginalPageMap = false,
}) {
  const railRef = useRef(null);
  const activeRef = useRef(null);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentPage]);

  if (!pageNumbers.length) return null;

  return (
    <div
      ref={railRef}
      style={{
        width: selectableThumbnails ? 76 : 88,
        overflowY: 'scroll',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        flexShrink: 0,
      }}
      className="h-full bg-zinc-950 border-r border-zinc-700 py-1 proof-thumb-rail-v2"
    >
      {pageNumbers.map((pageNumber, index) => {
        const pageIndex = index + 1;
        const isCurrentPage = currentPage === pageIndex;
        const isSelected = selectedPages.includes(pageNumber);

        return (
          <div
            key={`thumb-v2-${pageNumber}-${pageIndex}`}
            ref={isCurrentPage ? activeRef : null}
            onClick={() => onPageClick?.(pageIndex)}
            className={`flex flex-col items-center py-1.5 px-1 cursor-pointer transition-colors hover:bg-zinc-800 ${
              isSelected
                ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-400/70'
                : isCurrentPage
                ? 'bg-zinc-700 ring-1 ring-inset ring-amber-500/60'
                : ''
            }`}
          >
            <div
              className="overflow-hidden rounded border border-zinc-700 bg-white"
              style={{ width: `${thumbnailWidth}px` }}
            >
              <Page
                pageNumber={pageNumber}
                width={thumbnailWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<div style={{ height: 80 }} className="bg-zinc-700" />}
              />
            </div>
            {hasOriginalPageMap ? (
              <div className="mt-1 flex flex-col items-center leading-tight">
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-blue-300' : 'text-amber-300'}`}>
                  {pageIndex}
                </span>
                <span className="text-[9px] text-zinc-500">Src: {pageNumber}</span>
              </div>
            ) : (
              <span className={`mt-1 text-[9px] ${isSelected ? 'font-semibold text-blue-300' : 'text-zinc-500'}`}>
                {pageNumber}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}