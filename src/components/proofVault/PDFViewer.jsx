import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Search, X, Layers, Loader2, Download, Hand, Pencil, Highlighter, Eraser } from 'lucide-react';
import { buildMarkupOverlay, createHighlightRect, createPenStroke } from './pdfMarkupUtils';
import debounce from 'lodash/debounce';
import { normalizeHighlightGroups } from './highlightGroupUtils';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer({
  fileUrl,
  mode = 'controller',
  syncState,
  onStateChange,
  highlights = [],
  focusTarget = null,
  clippedPage = null,
  currentPage: controlledPage,
  onPageChange,
  allowPan = true,
  pageOverlay = null,
  visiblePages = null,
  selectableThumbnails = false,
  selectedPages = [],
  onSelectedPagesChange,
  thumbnailWidth = 62,
  liveMarkupEnabled = false,
  liveMarkupMode = 'navigate',
  liveMarkups = [],
  onLiveMarkupModeChange,
  onLiveMarkupsChange,
}) {
  const initialPage = controlledPage || (visiblePages?.length ? 1 : clippedPage || 1);
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
  const containerRef = useRef();
  const pageSurfaceRef = useRef();
  const bottomRailRef = useRef();
  const touchRef = useRef({});
  const dragRef = useRef({});
  const selectionAnchorRef = useRef(null);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const liveDraftRef = useRef(null);
  const [draftLiveStroke, setDraftLiveStroke] = useState(null);
  const [draftLiveHighlight, setDraftLiveHighlight] = useState(null);

  const pageNumbers = useMemo(() => {
    if (Array.isArray(visiblePages) && visiblePages.length > 0) {
      return visiblePages;
    }
    return Array.from({ length: numPages || 0 }, (_, index) => index + 1);
  }, [visiblePages, numPages]);

  const hasOriginalPageMap = Array.isArray(visiblePages) && visiblePages.length > 0;
  const activePageNumber = pageNumbers[currentPage - 1] || clippedPage || 1;
  const normalizedHighlightGroups = useMemo(
    () => normalizeHighlightGroups(highlights, clippedPage || activePageNumber),
    [highlights, clippedPage, activePageNumber]
  );
  const activeHighlights = useMemo(
    () => normalizedHighlightGroups
      .filter((group) => group.page === currentPage || group.page === activePageNumber)
      .flatMap((group) =>
        group.highlights.map((highlight, index) => ({
          ...highlight,
          __groupId: group.id,
          __groupName: group.name,
          __highlightIndex: index,
        }))
      ),
    [normalizedHighlightGroups, currentPage, activePageNumber]
  );
  const activeLiveMarkups = useMemo(() => buildMarkupOverlay(liveMarkups, activePageNumber), [liveMarkups, activePageNumber]);

  const debouncedPush = useCallback(
    debounce((s) => onStateChange && onStateChange(s), 250),
    [onStateChange]
  );

  useEffect(() => {
    if (controlledPage === undefined) return;
    setCurrentPage(controlledPage);
    setPageInput(String(controlledPage));
  }, [controlledPage]);

  useEffect(() => {
    if (mode !== 'viewer' || !syncState) return;
    if (syncState.currentPage) {
      setCurrentPage(syncState.currentPage);
      setPageInput(String(syncState.currentPage));
    }
    if (syncState.zoom !== undefined) setZoom(syncState.zoom);
    if (syncState.panX !== undefined) setPanX(syncState.panX);
    if (syncState.panY !== undefined) setPanY(syncState.panY);
  }, [syncState, mode]);

  useEffect(() => {
    if (pageNumbers.length === 0) return;
    if (currentPage > pageNumbers.length) {
      setCurrentPage(1);
      setPageInput('1');
    }
  }, [pageNumbers, currentPage]);

  // Auto-scroll the bottom thumbnail rail to keep active thumb visible
  useEffect(() => {
    if (!showThumbs || mode !== 'controller' || !bottomRailRef.current) return;
    const activeThumb = bottomRailRef.current.querySelector('[data-active="true"]');
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentPage, showThumbs, mode]);

  const goToPage = useCallback(
    (pageIndex) => {
      const target = Math.min(Math.max(1, pageIndex), pageNumbers.length || 1);
      if (controlledPage === undefined) {
        setCurrentPage(target);
        setPageInput(String(target));
        setPanX(0);
        setPanY(0);
      }
      onPageChange?.(target);
      if (mode === 'controller') debouncedPush({ currentPage: target, zoom, panX: 0, panY: 0 });
    },
    [pageNumbers.length, controlledPage, onPageChange, mode, debouncedPush, zoom]
  );

  const handleThumbnailSelection = useCallback(
    (pageNumber, event) => {
      if (!selectableThumbnails || !onSelectedPagesChange) return;

      const isToggleSelection = event?.metaKey || event?.ctrlKey;
      const isRangeSelection = event?.shiftKey && selectionAnchorRef.current !== null;
      let nextPages = [];

      if (isRangeSelection) {
        const anchorIndex = pageNumbers.indexOf(selectionAnchorRef.current);
        const targetIndex = pageNumbers.indexOf(pageNumber);
        const startIndex = Math.min(anchorIndex, targetIndex);
        const endIndex = Math.max(anchorIndex, targetIndex);
        nextPages = pageNumbers.slice(startIndex, endIndex + 1);
      } else if (isToggleSelection) {
        nextPages = selectedPages.includes(pageNumber)
          ? selectedPages.filter((page) => page !== pageNumber)
          : [...selectedPages, pageNumber].sort((a, b) => a - b);
        selectionAnchorRef.current = pageNumber;
      } else {
        nextPages = [pageNumber];
        selectionAnchorRef.current = pageNumber;
      }

      onSelectedPagesChange(nextPages);
    },
    [selectableThumbnails, onSelectedPagesChange, selectedPages, pageNumbers]
  );

  const handleSelectAllPages = useCallback(() => {
    if (!selectableThumbnails || !onSelectedPagesChange) return;
    onSelectedPagesChange(pageNumbers);
    selectionAnchorRef.current = pageNumbers[0] || null;
  }, [selectableThumbnails, onSelectedPagesChange, pageNumbers]);

  const applyZoom = useCallback(
    (nextZoom) => {
      const z = Math.min(Math.max(nextZoom, 0.2), 5);
      setZoom(z);
      if (mode === 'controller') debouncedPush({ currentPage, zoom: z, panX, panY });
    },
    [currentPage, panX, panY, mode, debouncedPush]
  );

  useEffect(() => {
    panXRef.current = panX;
    panYRef.current = panY;
  }, [panX, panY]);

  useEffect(() => {
    if (!focusTarget || !Array.isArray(focusTarget.highlights) || focusTarget.highlights.length === 0) return;
    if (focusTarget.page && focusTarget.page !== currentPage) return;

    const groupBounds = focusTarget.highlights.reduce((bounds, highlight) => {
      const left = Math.max(0, Number(highlight.x) || 0);
      const top = Math.max(0, Number(highlight.y) || 0);
      const right = Math.min(100, left + (Number(highlight.width) || 0));
      const bottom = Math.min(100, top + (Number(highlight.height) || 0));

      return {
        left: Math.min(bounds.left, left),
        top: Math.min(bounds.top, top),
        right: Math.max(bounds.right, right),
        bottom: Math.max(bounds.bottom, bottom),
      };
    }, { left: 100, top: 100, right: 0, bottom: 0 });

    const containerEl = containerRef.current;
    const pageEl = pageSurfaceRef.current;
    if (!containerEl || !pageEl) return;

    const pageWidth = pageEl.offsetWidth || 600;
    const pageHeight = pageEl.offsetHeight || 800;
    const regionWidthRatio = Math.max((groupBounds.right - groupBounds.left) / 100, 0.12);
    const regionHeightRatio = Math.max((groupBounds.bottom - groupBounds.top) / 100, 0.12);
    const containerWidth = containerEl.clientWidth || pageWidth;
    const containerHeight = containerEl.clientHeight || pageHeight;
    const targetZoom = Math.min(
      4,
      Math.max(
        1.6,
        Math.min(
          containerWidth / (pageWidth * regionWidthRatio * 2.2),
          containerHeight / (pageHeight * regionHeightRatio * 2.2)
        )
      )
    );

    setZoom(targetZoom);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const nextContainerEl = containerRef.current;
        const nextPageEl = pageSurfaceRef.current;
        if (!nextContainerEl || !nextPageEl) return;

        const containerRect = nextContainerEl.getBoundingClientRect();
        const pageRect = nextPageEl.getBoundingClientRect();
        const focusX = pageRect.left + (((groupBounds.left + groupBounds.right) / 2) / 100) * pageRect.width;
        const focusY = pageRect.top + (((groupBounds.top + groupBounds.bottom) / 2) / 100) * pageRect.height;
        const deltaX = containerRect.left + containerRect.width / 2 - focusX;
        const deltaY = containerRect.top + containerRect.height / 2 - focusY;
        const nextPanX = panXRef.current + deltaX;
        const nextPanY = panYRef.current + deltaY;

        panXRef.current = nextPanX;
        panYRef.current = nextPanY;
        setPanX(nextPanX);
        setPanY(nextPanY);

        if (mode === 'controller') {
          debouncedPush({ currentPage, zoom: targetZoom, panX: nextPanX, panY: nextPanY });
        }
      });
    });
  }, [focusTarget, currentPage, mode, debouncedPush]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        applyZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1));
      } else if (allowPan) {
        const nextPanY = panY - e.deltaY * 0.5;
        setPanY(nextPanY);
        if (mode === 'controller') debouncedPush({ currentPage, zoom, panX, panY: nextPanY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, panX, panY, currentPage, mode, applyZoom, debouncedPush, allowPan, numPages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e) => {
      if (liveMarkupEnabled && liveMarkupMode !== 'navigate') return;
      if (e.touches.length === 2) {
        touchRef.current = {
          mode: 'pinch',
          dist: Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          ),
          initZoom: zoom,
        };
      } else if (allowPan) {
        touchRef.current = { mode: 'pan', x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (touchRef.current.mode === 'pinch' && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        applyZoom(touchRef.current.initZoom * (dist / touchRef.current.dist));
      } else if (touchRef.current.mode === 'pan' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchRef.current.x;
        const dy = e.touches[0].clientY - touchRef.current.y;
        touchRef.current.x = e.touches[0].clientX;
        touchRef.current.y = e.touches[0].clientY;
        setPanX((px) => {
          const nextX = px + dx;
          setPanY((py) => {
            const nextY = py + dy;
            if (mode === 'controller') debouncedPush({ currentPage, zoom, panX: nextX, panY: nextY });
            return nextY;
          });
          return nextX;
        });
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [zoom, currentPage, mode, applyZoom, debouncedPush, allowPan, numPages]);

  const handleMouseDown = (e) => {
    if (liveMarkupEnabled && liveMarkupMode !== 'navigate') return;
    if (!allowPan) return;
    if (e.button === 0) dragRef.current = { dragging: true, x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    setPanX((px) => px + dx);
    setPanY((py) => py + dy);
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
    const pagesToSearch = pageNumbers.length > 0 ? pageNumbers : Array.from({ length: pdf.numPages }, (_, index) => index + 1);
    const matches = [];

    for (const pageNumber of pagesToSearch) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item) => item.str).join(' ');
      if (text.toLowerCase().includes(searchText.toLowerCase())) {
        matches.push(pageNumber);
      }
    }

    setSearchMatchPages(matches);
    setSearchIdx(0);
    if (matches.length > 0) {
      const nextPageIndex = pageNumbers.indexOf(matches[0]) + 1;
      goToPage(nextPageIndex || matches[0]);
    }
    setSearching(false);
  }, [searchText, fileUrl, goToPage, pageNumbers]);

  const searchNav = (dir) => {
    const next = (searchIdx + dir + searchMatchPages.length) % searchMatchPages.length;
    setSearchIdx(next);
    const nextPageIndex = pageNumbers.indexOf(searchMatchPages[next]) + 1;
    goToPage(nextPageIndex || 1);
  };

  const textRenderer = useCallback(
    ({ str }) => {
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
    },
    [searchText]
  );

  // Whether to show the bottom thumbnail strip
  const showBottomStrip = showThumbs && mode === 'controller' && numPages && numPages > 1;
  const STRIP_HEIGHT = 110;

  return (
    <div className="flex flex-col h-full bg-zinc-900 select-none overflow-hidden" style={{ position: 'relative' }}>
      {mode === 'controller' && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800 border-b border-zinc-700 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => setShowThumbs((v) => !v)}>
            <Layers className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-zinc-600 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => goToPage(parseInt(pageInput, 10) || 1)}
              onKeyDown={(e) => e.key === 'Enter' && goToPage(parseInt(pageInput, 10) || 1)}
              className="w-10 h-6 text-center text-xs bg-zinc-700 border-zinc-600 px-1"
            />
            <span className="text-[11px] text-zinc-500 whitespace-nowrap">/ {pageNumbers.length || '…'}</span>
            {hasOriginalPageMap && <span className="text-[11px] text-amber-400 whitespace-nowrap">Orig {activePageNumber}</span>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => goToPage(currentPage + 1)} disabled={!pageNumbers.length || currentPage >= pageNumbers.length}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-600 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => applyZoom(zoom - 0.15)}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] text-zinc-400 w-9 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => applyZoom(zoom + 0.15)}>
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
              debouncedPush({ currentPage, zoom: 1, panX: 0, panY: 0 });
            }}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className={`h-7 w-7 ${showSearch ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`} onClick={() => setShowSearch((v) => !v)}>
            <Search className="w-3.5 h-3.5" />
          </Button>
          {selectableThumbnails && pageNumbers.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-zinc-300 hover:text-white" onClick={handleSelectAllPages}>
              All
            </Button>
          )}
          {liveMarkupEnabled && (
            <>
              <div className="w-px h-4 bg-zinc-600 mx-1" />
              <Button variant="ghost" size="icon" className={`h-7 w-7 ${liveMarkupMode === 'navigate' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`} onClick={() => onLiveMarkupModeChange?.('navigate')}>
                <Hand className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className={`h-7 w-7 ${liveMarkupMode === 'pen' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`} onClick={() => onLiveMarkupModeChange?.('pen')}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className={`h-7 w-7 ${liveMarkupMode === 'highlight' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`} onClick={() => onLiveMarkupModeChange?.('highlight')}>
                <Highlighter className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => onLiveMarkupsChange?.((liveMarkups || []).slice(0, -1))}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => onLiveMarkupsChange?.([])}>
                <Eraser className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-zinc-300 hover:text-white">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </Button>
          <div className="flex-1" />
        </div>
      )}

      {showSearch && mode === 'controller' && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800/80 border-b border-zinc-700 shrink-0">
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

      {/* Main PDF area — padded at bottom to make room for the thumbnail strip */}
      <div
        className="flex-1 overflow-hidden"
        style={{ paddingBottom: showBottomStrip ? STRIP_HEIGHT : 0 }}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: nextPageCount }) => {
            setNumPages(nextPageCount);
            if (clippedPage && !visiblePages) {
              setCurrentPage(clippedPage);
              setPageInput(String(clippedPage));
            }
          }}
          loading={<div className="flex items-center justify-center w-full h-full"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>}
          error={<div className="text-red-400 text-sm p-8 text-center">Failed to load PDF.<br />Check file URL.</div>}
          className="flex h-full w-full overflow-hidden"
        >
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
            <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'top center', userSelect: 'none' }}>
              <div ref={pageSurfaceRef} className="relative shadow-2xl">
                <Page
                  pageNumber={activePageNumber}
                  width={600}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  customTextRenderer={textRenderer}
                  loading={<div className="w-[600px] h-[800px] bg-zinc-800 animate-pulse rounded" />}
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
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {activeLiveMarkups.map((item) => item.type === 'highlight' ? (
                    <rect
                      key={item.id}
                      x={Math.round(item.x * 1000)}
                      y={Math.round(item.y * 1000)}
                      width={Math.round(item.width * 1000)}
                      height={Math.round(item.height * 1000)}
                      fill={item.color}
                      opacity={item.opacity ?? 0.32}
                      rx="8"
                      ry="8"
                    />
                  ) : (
                    <polyline
                      key={item.id}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={item.width || 6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={(item.points || []).map((point) => `${Math.round(point.x * 1000)},${Math.round(point.y * 1000)}`).join(' ')}
                    />
                  ))}
                  {draftLiveHighlight ? (
                    <rect
                      x={Math.round(draftLiveHighlight.x * 1000)}
                      y={Math.round(draftLiveHighlight.y * 1000)}
                      width={Math.round(draftLiveHighlight.width * 1000)}
                      height={Math.round(draftLiveHighlight.height * 1000)}
                      fill={draftLiveHighlight.color}
                      opacity={draftLiveHighlight.opacity ?? 0.32}
                      rx="8"
                      ry="8"
                    />
                  ) : null}
                  {draftLiveStroke ? (
                    <polyline
                      fill="none"
                      stroke={draftLiveStroke.color}
                      strokeWidth={draftLiveStroke.width || 6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={(draftLiveStroke.points || []).map((point) => `${Math.round(point.x * 1000)},${Math.round(point.y * 1000)}`).join(' ')}
                    />
                  ) : null}
                </svg>
                {liveMarkupEnabled && (
                  <div
                    className={`absolute inset-0 ${liveMarkupMode === 'navigate' ? 'pointer-events-none' : 'pointer-events-auto'}`}
                    style={{ touchAction: liveMarkupMode === 'navigate' ? 'none' : 'none' }}
                    onPointerDown={(event) => {
                      if (liveMarkupMode === 'navigate') return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      const point = {
                        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
                        y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
                      };
                      if (liveMarkupMode === 'pen') {
                        const stroke = createPenStroke([point]);
                        stroke.page = activePageNumber;
                        liveDraftRef.current = point;
                        setDraftLiveStroke(stroke);
                      }
                      if (liveMarkupMode === 'highlight') {
                        liveDraftRef.current = point;
                        const highlight = createHighlightRect(point, point);
                        highlight.page = activePageNumber;
                        setDraftLiveHighlight(highlight);
                      }
                    }}
                    onPointerMove={(event) => {
                      if (liveMarkupMode === 'pen' && draftLiveStroke) {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const point = {
                          x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
                          y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
                        };
                        setDraftLiveStroke((current) => ({ ...current, points: [...(current?.points || []), point] }));
                      }
                      if (liveMarkupMode === 'highlight' && liveDraftRef.current) {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const point = {
                          x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
                          y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
                        };
                        const highlight = createHighlightRect(liveDraftRef.current, point);
                        highlight.page = activePageNumber;
                        setDraftLiveHighlight(highlight);
                      }
                    }}
                    onPointerUp={() => {
                      if (draftLiveStroke?.points?.length > 1) {
                        onLiveMarkupsChange?.([...(liveMarkups || []), draftLiveStroke]);
                      }
                      if (draftLiveHighlight && draftLiveHighlight.width > 0.003 && draftLiveHighlight.height > 0.003) {
                        onLiveMarkupsChange?.([...(liveMarkups || []), draftLiveHighlight]);
                      }
                      liveDraftRef.current = null;
                      setDraftLiveStroke(null);
                      setDraftLiveHighlight(null);
                    }}
                    onPointerLeave={() => {
                      liveDraftRef.current = null;
                      setDraftLiveStroke(null);
                      setDraftLiveHighlight(null);
                    }}
                  />
                )}
                {pageOverlay}
              </div>
            </div>
          </div>
        </Document>
      </div>

      {/* BOTTOM HORIZONTAL THUMBNAIL STRIP — rendered outside Document so it controls its own flex layout */}
      {showBottomStrip && (
        <div
          ref={bottomRailRef}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${STRIP_HEIGHT}px`,
            background: 'rgba(24,24,27,0.95)',
            borderTop: '1px solid #3f3f46',
            zIndex: 20,
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
            scrollbarWidth: 'thin',
            scrollbarColor: '#52525b #09090b',
          }}
        >
          {/* We render Page components directly — no nested Document wrapper */}
          <Document file={fileUrl} loading={null} error={null} className="flex flex-row gap-1.5 items-center h-full">
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1;
              const pageIndex = pageNumbers.indexOf(pageNum);
              const isActive = currentPage === (pageIndex >= 0 ? pageIndex + 1 : pageNum);
              const isSelected = selectableThumbnails && selectedPages.includes(pageNum);
              return (
                <div
                  key={`bthumb-${pageNum}`}
                  data-active={isActive ? 'true' : 'false'}
                  onClick={(event) => {
                    if (selectableThumbnails) handleThumbnailSelection(pageNum, event);
                    goToPage(pageIndex >= 0 ? pageIndex + 1 : pageNum);
                  }}
                  style={{
                    flexShrink: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '3px',
                    borderRadius: '4px',
                    background: isActive ? '#44403c' : isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border: isActive ? '1px solid #f59e0b' : isSelected ? '1px solid rgba(96,165,250,0.7)' : '1px solid transparent',
                  }}
                >
                  <div style={{ overflow: 'hidden', borderRadius: '2px', border: '1px solid #52525b', background: 'white' }}>
                    <Page
                      pageNumber={pageNum}
                      width={55}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<div style={{ width: 55, height: 72, background: '#3f3f46' }} />}
                    />
                  </div>
                  <span style={{ fontSize: '9px', color: isActive ? '#f59e0b' : '#71717a' }}>{pageNum}</span>
                </div>
              );
            })}
          </Document>
        </div>
      )}
    </div>
  );
}