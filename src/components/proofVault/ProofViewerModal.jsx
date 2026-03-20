import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import PDFViewer from './PDFViewer';
import ExtractViewer from './ExtractViewer';
import ExtractClipViewer from './ExtractClipViewer';
import VideoViewer from './VideoViewer';
import VideoClipViewer from './VideoClipViewer';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

const DEFAULT_W = 900;
const DEFAULT_H = 680;
const MIN_W = 400;
const MIN_H = 300;

export default function ProofViewerModal({ proof, allProofs, isOpen, onClose }) {
  const [viewerState, setViewerState] = useState({ currentPage: 1, zoom: 1, panX: 0, panY: 0 });
  const { url, isLoading } = useResolvedProofAsset(isOpen ? proof : null);

  const [pos, setPos] = useState({ x: Math.max(0, (window.innerWidth - DEFAULT_W) / 2), y: Math.max(0, (window.innerHeight - DEFAULT_H) / 2) });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [maximized, setMaximized] = useState(false);
  const [prevRect, setPrevRect] = useState(null);

  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const modalRef = useRef(null);

  // Reset position/size when proof changes
  useEffect(() => {
    if (isOpen) {
      setPos({ x: Math.max(0, (window.innerWidth - DEFAULT_W) / 2), y: Math.max(0, (window.innerHeight - DEFAULT_H) / 2) });
      setSize({ w: DEFAULT_W, h: DEFAULT_H });
      setMaximized(false);
    }
  }, [proof?.id, isOpen]);

  const handleDragMouseDown = useCallback((e) => {
    if (maximized) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX - pos.x, startY: e.clientY - pos.y };

    const onMove = (ev) => {
      const x = Math.max(0, Math.min(window.innerWidth - size.w, ev.clientX - dragRef.current.startX));
      const y = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dragRef.current.startY));
      setPos({ x, y });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos, size, maximized]);

  const handleResizeMouseDown = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h, startPosX: pos.x, startPosY: pos.y, direction };

    const onMove = (ev) => {
      const r = resizeRef.current;
      let newW = r.startW;
      let newH = r.startH;
      let newX = r.startPosX;
      let newY = r.startPosY;
      const dx = ev.clientX - r.startX;
      const dy = ev.clientY - r.startY;

      if (r.direction.includes('e')) newW = Math.max(MIN_W, r.startW + dx);
      if (r.direction.includes('s')) newH = Math.max(MIN_H, r.startH + dy);
      if (r.direction.includes('w')) { newW = Math.max(MIN_W, r.startW - dx); newX = r.startPosX + (r.startW - newW); }
      if (r.direction.includes('n')) { newH = Math.max(MIN_H, r.startH - dy); newY = r.startPosY + (r.startH - newH); }

      setSize({ w: newW, h: newH });
      setPos({ x: newX, y: newY });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size, pos]);

  const toggleMaximize = () => {
    if (maximized) {
      setPos(prevRect.pos);
      setSize(prevRect.size);
      setMaximized(false);
    } else {
      setPrevRect({ pos, size });
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
      setMaximized(true);
    }
  };

  if (!isOpen || !proof) return null;

  const isExtract = proof.proof_child_type === 'Extract';
  const isExtractClip = proof.proof_child_type === 'ExtractClip';
  const isVideoClip = proof.proof_child_type === 'VideoClip';
  const resolvedVideoProof = {
    ...proof,
    file_url: proof.file_type === 'Video' ? '' : url || proof.file_url,
    video_url: proof.file_type === 'Video' ? (url || proof.video_url || proof.file_url) : proof.video_url,
  };

  const resizeHandles = [
    { dir: 'n',  style: { top: 0, left: 4, right: 4, height: 4, cursor: 'n-resize' } },
    { dir: 's',  style: { bottom: 0, left: 4, right: 4, height: 4, cursor: 's-resize' } },
    { dir: 'e',  style: { right: 0, top: 4, bottom: 4, width: 4, cursor: 'e-resize' } },
    { dir: 'w',  style: { left: 0, top: 4, bottom: 4, width: 4, cursor: 'w-resize' } },
    { dir: 'nw', style: { top: 0, left: 0, width: 10, height: 10, cursor: 'nw-resize' } },
    { dir: 'ne', style: { top: 0, right: 0, width: 10, height: 10, cursor: 'ne-resize' } },
    { dir: 'sw', style: { bottom: 0, left: 0, width: 10, height: 10, cursor: 'sw-resize' } },
    { dir: 'se', style: { bottom: 0, right: 0, width: 10, height: 10, cursor: 'se-resize' } },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Floating window */}
      <div
        ref={modalRef}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: maximized ? 0 : 8,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          border: '1px solid #3f3f46',
          background: '#18181b',
        }}
      >
        {/* Resize handles */}
        {!maximized && resizeHandles.map(({ dir, style }) => (
          <div
            key={dir}
            style={{ position: 'absolute', zIndex: 10, ...style }}
            onMouseDown={(e) => handleResizeMouseDown(e, dir)}
          />
        ))}

        {/* Title bar */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700 shrink-0 select-none"
          style={{ cursor: maximized ? 'default' : 'move' }}
          onMouseDown={handleDragMouseDown}
        >
          <span className="flex-1 text-sm text-zinc-300 truncate">{proof.formal_name || proof.name}</span>
          <button
            className="text-zinc-400 hover:text-white p-1 rounded"
            onClick={toggleMaximize}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {maximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            className="text-zinc-400 hover:text-white p-1 rounded"
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading && proof.file_source === 'dropbox' ? (
            <div className="flex items-center justify-center h-full text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : isExtractClip ? (
            <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : isExtract ? (
            <ExtractViewer proof={proof} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : isVideoClip ? (
            <div className="p-6">
              <VideoClipViewer videoUrl={url || proof.video_url || proof.file_url} segments={proof.video_clips || []} />
            </div>
          ) : proof.file_type === 'Video' ? (
            <VideoViewer proof={resolvedVideoProof} allProofs={allProofs} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : (
            <PDFViewer fileUrl={url || proof.file_url} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          )}
        </div>
      </div>
    </>
  );
}