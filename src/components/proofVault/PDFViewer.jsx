import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Search, X, PanelLeftClose, PanelLeft, Loader2 } from 'lucide-react';
import debounce from 'lodash/debounce';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer({ 
  fileUrl, 
  mode = 'controller',
  syncState, 
  onStateChange, 
  highlights = [], 
  clippedPage = null 
}) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(clippedPage || 1);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [pageInput, setPageInput] = useState(String(clippedPage || 1));
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchMatchPages, setSearchMatchPages] = useState([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [showThumbs, setShowThumbs] = useState(true);

  const containerRef = useRef();
  const touchRef = useRef({});
  const dragRef = useRef({});

  const debouncedPush = useCallback(
    debounce((s) => onStateChange && onStateChange(s), 250),
    [onStateChange]
  );

  // Mirror sync state in viewer mode
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

  const goToPage = useCallback((p) => {
    const target = Math.min(Math.max(1, p), numPages || 1);
    if (clippedPage && target !== clippedPage) return;
    setCurrentPage(target);
    setPageInput(String(target));
    setPanX(0);
    setPanY(0);
    if (mode === 'controller') debouncedPush({ currentPage: target, zoom, panX: 0, panY: 0 });
  }, [numPages, zoom, mode, debouncedPush, clippedPage]);

  const applyZoom = useCallback((nz) => {
    const z = Math.min(Math.max(nz, 0.2), 5);
    setZoom(z);
    if (mode === 'controller') debouncedPush({ currentPage, zoom: z, panX, panY });
  }, [currentPage, panX, panY, mode, debouncedPush]);

  // Mouse wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        applyZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1));
      } else {
        const ny = panY - e.deltaY * 0.5;
        setPanY(ny);
        if (mode === 'controller') debouncedPush({ currentPage, zoom, panX, panY: ny });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, panX, panY, currentPage, mode, applyZoom, debouncedPush]);

  // Touch pinch + pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        touchRef.current = {
          mode: 'pinch',
          dist: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY),
          initZoom: zoom,
        };
      } else {
        touchRef.current = { mode: 'pan', x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (touchRef.current.mode === 'pinch' && e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        applyZoom(touchRef.current.initZoom * (dist / touchRef.current.dist));
      } else if (touchRef.current.mode === 'pan' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchRef.current.x;
        const dy = e.touches[0].clientY - touchRef.current.y;
        touchRef.current.x = e.touches[0].clientX;
        touchRef.current.y = e.touches[0].clientY;
        setPanX(px => {
          const nx = px + dx;
          setPanY(py => {
            const ny = py + dy;
            if (mode === 'controller') debouncedPush({ currentPage, zoom, panX: nx, panY: ny });
            return ny;
          });
          return nx;
        });
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [zoom, panX, panY, currentPage, mode, applyZoom, debouncedPush]);

  // Mouse drag pan
  const handleMouseDown = (e) => {
    if (e.button === 0) dragRef.current = { dragging: true, x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    setPanX(px => px + dx);
    setPanY(py => py + dy);
  };
  const handleMouseUp = () => {
    if (dragRef.current.dragging) {
      dragRef.current.dragging = false;
      if (mode === 'controller') debouncedPush({ currentPage, zoom, panX, panY });
    }
  };

  // Text search
  const handleSearch = useCallback(async () => {
    if (!searchText.trim() || !fileUrl) return;
    setSearching(true);
    const pdf = await pdfjs.getDocument(fileUrl).promise;
    const matches = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const text = tc.items.map(item => item.str).join(' ');
      if (text.toLowerCase().includes(searchText.toLowerCase())) matches.push(i);
    }
    setSearchMatchPages(matches);
    setSearchIdx(0);
    if (matches.length > 0) goToPage(matches[0]);
    setSearching(false);
  }, [searchText, fileUrl, goToPage]);

  const searchNav = (dir) => {
    const next = (searchIdx + dir + searchMatchPages.length) % searchMatchPages.length;
    setSearchIdx(next);
    goToPage(searchMatchPages[next]);
  };

  const textRenderer = useCallback(({ str }) => {
    if (!searchText || !str) return <>{str}</>;
    try {
      const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = str.split(new RegExp(`(${escaped})`, 'gi'));
      return (
        <>
          {parts.map((part, i) =>
            part.toLowerCase() === searchText.toLowerCase() ? (
              <mark key={i} style={{ background: '#f59e0b', color: '#1a1a1a', padding: '0 1px', borderRadius: '2px' }}>
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch {
      return <>{str}</>;
    }
  }, [searchText]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 select-none overflow-hidden">
      {/* Toolbar */}
      {mode === 'controller' && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800 border-b border-zinc-700 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => setShowThumbs(s => !s)}
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
              onChange={e => setPageInput(e.target.value)}
              onBlur={() => goToPage(parseInt(pageInput) || 1)}
              onKeyDown={e => e.key === 'Enter' && goToPage(parseInt(pageInput) || 1)}
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
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${showSearch ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setShowSearch(s => !s)}
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Search bar */}
      {showSearch && mode === 'controller' && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800/80 border-b border-zinc-700 shrink-0">
          <Input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
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
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            if (clippedPage) setCurrentPage(clippedPage);
          }}
          loading={<div className="flex items-center justify-center w-full h-full"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>}
          error={<div className="text-red-400 text-sm p-8 text-center">Failed to load PDF.<br />Check file URL.</div>}
          className="flex flex-1 overflow-hidden w-full"
        >
          {/* Thumbnails sidebar */}
          {showThumbs && numPages && mode === 'controller' && (
            <div className="w-[88px] bg-zinc-950 overflow-y-auto shrink-0 border-r border-zinc-700 py-1">
              {Array.from({ length: Math.min(numPages, 100) }, (_, i) => i + 1).map(p => (
                <div
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`flex flex-col items-center py-1.5 px-1 cursor-pointer transition-colors hover:bg-zinc-800 ${
                    currentPage === p ? 'bg-zinc-700 ring-1 ring-inset ring-amber-500/60' : ''
                  }`}
                >
                  <div className="w-[62px] overflow-hidden rounded border border-zinc-700 bg-white">
                    <Page pageNumber={p} width={62} renderTextLayer={false} renderAnnotationLayer={false} loading={<div className="h-[80px] bg-zinc-700" />} />
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1">{p}</span>
                </div>
              ))}
            </div>
          )}

          {/* Main page view */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden flex items-start justify-center pt-6 cursor-grab active:cursor-grabbing bg-zinc-900"
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (dragRef.current.dragging) {
                dragRef.current.dragging = false;
              }
            }}
          >
            <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'top center', userSelect: 'none' }}>
              <div className="relative shadow-2xl">
                <Page
                  pageNumber={currentPage}
                  width={600}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  customTextRenderer={textRenderer}
                  loading={<div className="w-[600px] h-[800px] bg-zinc-800 animate-pulse rounded" />}
                />
                {/* Highlight overlays for ExtractClip */}
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${h.x}%`,
                      top: `${h.y}%`,
                      width: `${h.width}%`,
                      height: `${h.height}%`,
                      background: h.color || '#fbbf24',
                      opacity: h.opacity ?? 0.4,
                      pointerEvents: 'none',
                      borderRadius: '2px',
                      mixBlendMode: 'multiply',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
}