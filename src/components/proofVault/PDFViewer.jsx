import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Search, X, PanelLeftClose, PanelLeft, Loader2 } from 'lucide-react';
import debounce from 'lodash/debounce';
import { getHighlightsForPage, getPrimaryHighlightPage, sortUniquePages } from '@/lib/proofPdfUtils';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer({
  fileUrl,
  mode = 'controller',
  syncState,
  onStateChange,
  highlights = [],
  clippedPage = null,
  currentPage: controlledPage,
  onPageChange,
  allowPan = true,
  pageOverlay = null,
  allowPageSelection = false,
  selectedPages = [],
  onSelectedPagesChange,
  onDocumentLoad,
  showHighlights = true,
  dimInactiveArea = false,
}) {
  const initialPage = controlledPage || clippedPage || getPrimaryHighlightPage(highlights, 1);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchMatchPages, setSearchMatchPages] = useState([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [showThumbs, setShowThumbs] = useState(true);
  const [focusOrigin, setFocusOrigin] = useState('top center');
  const containerRef = useRef();
  const touchRef = useRef({});
  const dragRef = useRef({});
  const lastSelectedPageRef = useRef(null);

  const currentPageHighlights = showHighlights
    ? getHighlightsForPage(highlights, currentPage, clippedPage || 1)
    : [];

  const debouncedPush = useCallback(
    debounce((nextState) => onStateChange && onStateChange(nextState), 250),
    [onStateChange]
  );

  useEffect(() => {
    if (controlledPage === undefined) return;
    setCurrentPage(controlledPage);
    setPageInput(String(controlledPage));
  }, [controlledPage]);

  useEffect(() => {
    if (!syncState) return;
    if (syncState.currentPage) {
      setCurrentPage(syncState.currentPage);
      setPageInput(String(syncState.currentPage));
    }
    if (syncState.zoom !== undefined) setZoom(syncState.zoom);
    if (syncState.panX !== undefined) setPanX(syncState.panX);
    if (syncState.panY !== undefined) setPanY(syncState.panY);
    if (syncState.focusOrigin !== undefined) setFocusOrigin(syncState.focusOrigin);
  }, [syncState]);

  const goToPage = useCallback(
    (page) => {
      const target = Math.min(Math.max(1, page), numPages || 1);
      if (controlledPage === undefined) {
        setCurrentPage(target);
        setPageInput(String(target));
        setPanX(0);
        setPanY(0);
      }
      onPageChange?.(target);
      if (mode === 'controller') {
        debouncedPush({ currentPage: target, zoom, panX: 0, panY: 0 });
      }
    },
    [controlledPage, debouncedPush, mode, numPages, onPageChange, zoom]
  );

  const handleThumbnailClick = useCallback((page, event) => {
    if (!allowPageSelection || !onSelectedPagesChange) {
      goToPage(page);
      return;
    }

    const sortedSelectedPages = sortUniquePages(selectedPages);
    const anchorPage = lastSelectedPageRef.current || sortedSelectedPages[sortedSelectedPages.length - 1] || page;
    let nextPages = [];

    if (event.shiftKey) {
      const start = Math.min(anchorPage, page);
      const end = Math.max(anchorPage, page);
      for (let nextPage = start; nextPage <= end; nextPage += 1) {
        nextPages.push(nextPage);
      }
    } else if (event.metaKey || event.ctrlKey) {
      nextPages = sortedSelectedPages.includes(page)
        ? sortedSelectedPages.filter((selectedPage) => selectedPage !== page)
        : [...sortedSelectedPages, page];
    } else {
      nextPages = [page];
    }

    lastSelectedPageRef.current = page;
    onSelectedPagesChange(sortUniquePages(nextPages));
    goToPage(page);
  }, [allowPageSelection, goToPage, onSelectedPagesChange, selectedPages]);

  const applyZoom = useCallback(
    (nextZoom) => {
      const normalizedZoom = Math.min(Math.max(nextZoom, 0.2), 5);
      setZoom(normalizedZoom);
      if (mode === 'controller') {
        debouncedPush({ currentPage, zoom: normalizedZoom, panX, panY });
      }
    },
    [currentPage, debouncedPush, mode, panX, panY]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onWheel = (event) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        applyZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
      } else if (allowPan) {
        const nextPanY = panY - event.deltaY * 0.5;
        setPanY(nextPanY);
        if (mode === 'controller') debouncedPush({ currentPage, zoom, panX, panY: nextPanY });
      }
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [allowPan, applyZoom, currentPage, debouncedPush, mode, panX, panY, zoom]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onTouchStart = (event) => {
      if (event.touches.length === 2) {
        touchRef.current = {
          mode: 'pinch',
          distance: Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY
          ),
          initialZoom: zoom,
        };
      } else if (allowPan) {
        touchRef.current = { mode: 'pan', x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
    };
    const onTouchMove = (event) => {
      event.preventDefault();
      if (touchRef.current.mode === 'pinch' && event.touches.length === 2) {
        const distance = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        );
        applyZoom(touchRef.current.initialZoom * (distance / touchRef.current.distance));
      } else if (touchRef.current.mode === 'pan' && event.touches.length === 1) {
        const dx = event.touches[0].clientX - touchRef.current.x;
        const dy = event.touches[0].clientY - touchRef.current.y;
        touchRef.current.x = event.touches[0].clientX;
        touchRef.current.y = event.touches[0].clientY;
        setPanX((previousPanX) => {
          const nextPanX = previousPanX + dx;
          setPanY((previousPanY) => {
            const nextPanY = previousPanY + dy;
            if (mode === 'controller') {
              debouncedPush({ currentPage, zoom, panX: nextPanX, panY: nextPanY });
            }
            return nextPanY;
          });
          return nextPanX;
        });
      }
    };
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
    };
  }, [allowPan, applyZoom, currentPage, debouncedPush, mode, zoom]);

  const handleMouseDown = (event) => {
    if (!allowPan) return;
    if (event.button === 0) dragRef.current = { dragging: true, x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event) => {
    if (!dragRef.current.dragging) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current.x = event.clientX;
    dragRef.current.y = event.clientY;
    setPanX((previousPanX) => previousPanX + dx);
    setPanY((previousPanY) => previousPanY + dy);
  };

  const handleMouseUp = () => {
    if (dragRef.current.dragging) {
      dragRef.current.dragging = false;
      if (mode === 'controller') debouncedPush({ currentPage, zoom, panX, panY });
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchText.trim() || !fileUrl) return;
    setSearching(true);
    const pdf = await pdfjs.getDocument(fileUrl).promise;
    const matches = [];
    for (let page = 1; page <= pdf.numPages; page += 1) {
      const nextPage = await pdf.getPage(page);
      const textContent = await nextPage.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      if (pageText.toLowerCase().includes(searchText.toLowerCase())) {
        matches.push(page);
      }
    }
    setSearchMatchPages(matches);
    setSearchIdx(0);
    if (matches.length > 0) goToPage(matches[0]);
    setSearching(false);
  }, [fileUrl, goToPage, searchText]);

  const searchNav = (direction) => {
    const nextIndex = (searchIdx + direction + searchMatchPages.length) % searchMatchPages.length;
    setSearchIdx(nextIndex);
    goToPage(searchMatchPages[nextIndex]);
  };

  const textRenderer = useCallback(({ str }) => {
    if (!searchText || !str) return str;

    const escapeHtml = (value) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    try {
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escapeHtml(str).replace(
        new RegExp(escapedSearch.replace(/&/g, '&amp;'), 'gi'),
        (match) => `<mark style="background:#f59e0b;color:#1a1a1a;padding:0 1px;border-radius:2px;">${match}</mark>`
      );
    } catch {
      return escapeHtml(str);
    }
  }, [searchText]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 select-none overflow-hidden">
      {mode === 'controller' && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800 border-b border-zinc-700 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => setShowThumbs((value) => !value)}
          >
            {showThumbs ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
          </Button>
          <div className="w-px h-4 bg-zinc-600 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onBlur={() => goToPage(parseInt(pageInput, 10) || 1)}
              onKeyDown={(event) => event.key === 'Enter' && goToPage(parseInt(pageInput, 10) || 1)}
              className="w-10 h-6 text-center text-xs bg-zinc-700 border-zinc-600 px-1"
            />
            <span className="text-[11px] text-zinc-500 whitespace-nowrap">/ {numPages || '…'}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => goToPage(currentPage + 1)}
            disabled={!numPages || currentPage >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-600 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => applyZoom(zoom - 0.15)}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] text-zinc-400 w-9 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => applyZoom(zoom + 0.15)}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => {
              setZoom(1);
              setPanX(0);
              setPanY(0);
              setFocusOrigin('top center');
              debouncedPush({ currentPage, zoom: 1, panX: 0, panY: 0 });
            }}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${showSearch ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setShowSearch((value) => !value)}
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
          <div className="flex-1" />
        </div>
      )}

      {showSearch && mode === 'controller' && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800/80 border-b border-zinc-700 shrink-0">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            placeholder="Search text in PDF…"
            className="flex-1 h-7 text-sm bg-zinc-700 border-zinc-600"
            autoFocus
          />
          <Button size="sm" className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-black text-xs" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
          </Button>
          {searchMatchPages.length > 0 && (
            <>
              <span className="text-xs text-zinc-400 whitespace-nowrap">{searchIdx + 1} / {searchMatchPages.length}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400" onClick={() => searchNav(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400" onClick={() => searchNav(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {searchMatchPages.length === 0 && searchText && !searching && <span className="text-xs text-zinc-500">No matches</span>}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400"
            onClick={() => {
              setShowSearch(false);
              setSearchText('');
              setSearchMatchPages([]);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: nextNumPages }) => {
            setNumPages(nextNumPages);
            onDocumentLoad?.({ numPages: nextNumPages });
            if (controlledPage === undefined) {
              const nextPage = clippedPage || getPrimaryHighlightPage(highlights, 1);
              setCurrentPage(nextPage);
              setPageInput(String(nextPage));
            }
          }}
          loading={
            <div className="flex items-center justify-center w-full h-full">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          }
          error={
            <div className="text-red-400 text-sm p-8 text-center">
              Failed to load PDF.
              <br />
              Check file URL.
            </div>
          }
          className="flex flex-1 overflow-hidden w-full"
        >
          {showThumbs && numPages && (mode === 'controller' || allowPageSelection) && (
            <div className="w-[88px] bg-zinc-950 overflow-y-auto shrink-0 border-r border-zinc-700 py-1">
              {Array.from({ length: Math.min(numPages, 100) }, (_, index) => index + 1).map((page) => {
                const isSelected = allowPageSelection && selectedPages.includes(page);
                const isCurrent = currentPage === page;

                return (
                  <div
                    key={page}
                    onClick={(event) => handleThumbnailClick(page, event)}
                    className={`flex flex-col items-center py-1.5 px-1 cursor-pointer transition-colors hover:bg-zinc-800 ${isCurrent ? 'bg-zinc-800' : ''} ${isSelected ? 'ring-1 ring-inset ring-blue-500 bg-blue-500/10' : ''}`}
                  >
                    <div className={`w-[62px] overflow-hidden rounded border bg-white ${isSelected ? 'border-blue-500' : 'border-zinc-700'} ${isCurrent ? 'ring-1 ring-amber-500/70 ring-inset' : ''}`}>
                      <Page
                        pageNumber={page}
                        width={62}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={<div className="h-[80px] bg-zinc-700" />}
                      />
                    </div>
                    <span className={`text-[9px] mt-1 ${isSelected ? 'text-blue-300' : 'text-zinc-500'}`}>{page}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div
            ref={containerRef}
            className={`flex-1 overflow-hidden flex items-start justify-center pt-6 bg-zinc-900 ${allowPan ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (dragRef.current.dragging) dragRef.current.dragging = false;
            }}
          >
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: focusOrigin,
                userSelect: 'none',
              }}
            >
              <div className="relative shadow-2xl">
                <Page
                  pageNumber={currentPage}
                  width={600}
                  renderTextLayer
                  renderAnnotationLayer
                  customTextRenderer={textRenderer}
                  loading={<div className="w-[600px] h-[800px] bg-zinc-800 animate-pulse rounded" />}
                />
                {dimInactiveArea && currentPageHighlights.length > 0 && (
                  <div className="absolute inset-0 bg-black/35 pointer-events-none" />
                )}
                {currentPageHighlights.map((highlight, index) => (
                  <div
                    key={`${currentPage}-${index}-${highlight.x}-${highlight.y}`}
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
                      border: dimInactiveArea ? '2px solid rgba(251, 191, 36, 0.95)' : 'none',
                    }}
                  />
                ))}
                {pageOverlay}
              </div>
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
}