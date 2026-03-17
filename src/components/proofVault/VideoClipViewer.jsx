import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';
import debounce from 'lodash/debounce';

function toSeconds(value) {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  const parts = value.split(':').map(Number).filter((part) => !Number.isNaN(part));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function normalizeSegments(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed : [];
}

export default function VideoClipViewer({ videoUrl, segments, mode = 'controller', onStateChange }) {
  const playerRef = useRef(null);
  const shouldAutoResumeRef = useRef(false);
  const segmentItemRefs = useRef({});
  const normalizedSegments = useMemo(() => normalizeSegments(segments), [segments]);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const debouncedPush = useCallback(
    debounce((state) => onStateChange && onStateChange(state), 150),
    [onStateChange]
  );

  const pushImmediate = useCallback((state) => {
    debouncedPush.cancel?.();
    onStateChange && onStateChange(state);
  }, [debouncedPush, onStateChange]);

  const jumpToSegment = useCallback((segmentIndex, resumeAfterSeek = false) => {
    const nextSegment = normalizedSegments[segmentIndex];
    if (!nextSegment) return;
    const startSec = toSeconds(nextSegment.start);
    shouldAutoResumeRef.current = resumeAfterSeek;
    setPlaying(false);
    setCurrentSegmentIdx(segmentIndex);
    setCurrentTime(startSec);
    playerRef.current?.seekTo(startSec, 'seconds');
    if (mode === 'controller') {
      pushImmediate({ currentTime: startSec, playing: false });
    }
  }, [mode, normalizedSegments, pushImmediate]);

  useEffect(() => {
    if (!normalizedSegments.length) return;
    const currentSegment = normalizedSegments[currentSegmentIdx] || normalizedSegments[0];
    const startSec = toSeconds(currentSegment.start);
    playerRef.current?.seekTo(startSec, 'seconds');
    setCurrentTime(startSec);

    if (shouldAutoResumeRef.current) {
      const timeout = setTimeout(() => {
        setPlaying(true);
        if (mode === 'controller') {
          pushImmediate({ currentTime: startSec, playing: true });
        }
        shouldAutoResumeRef.current = false;
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [currentSegmentIdx, normalizedSegments, mode, pushImmediate]);

  useEffect(() => {
    if (!panelOpen) return;
    const activeItem = segmentItemRefs.current[currentSegmentIdx];
    if (!activeItem) return;

    const timeout = setTimeout(() => {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    return () => clearTimeout(timeout);
  }, [currentSegmentIdx, panelOpen]);

  useEffect(() => {
    if (!normalizedSegments.length || !playing) return;
    const segment = normalizedSegments[currentSegmentIdx];
    const endSec = toSeconds(segment.end);

    if (currentTime >= endSec) {
      if (currentSegmentIdx < normalizedSegments.length - 1) {
        jumpToSegment(currentSegmentIdx + 1, true);
      } else {
        setPlaying(false);
        if (mode === 'controller') {
          pushImmediate({ currentTime: endSec, playing: false });
        }
      }
    }
  }, [currentTime, currentSegmentIdx, normalizedSegments, playing, jumpToSegment, mode, pushImmediate]);

  useEffect(() => () => debouncedPush.cancel?.(), [debouncedPush]);

  if (!normalizedSegments.length) {
    return <div className="flex items-center justify-center h-full text-slate-500 italic">No segments</div>;
  }

  const segment = normalizedSegments[currentSegmentIdx];
  const startSec = toSeconds(segment.start);

  return (
    <div className="relative h-full bg-black overflow-hidden">
      <div className="relative h-full min-h-0 overflow-hidden">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          controls={false}
          playing={playing}
          onProgress={({ playedSeconds }) => {
            setCurrentTime(playedSeconds);
            if (mode === 'controller' && playing) {
              debouncedPush({ currentTime: playedSeconds, playing: true });
            }
          }}
          onReady={() => {
            playerRef.current?.seekTo(startSec, 'seconds');
            setCurrentTime(startSec);
          }}
          progressInterval={250}
          style={{ position: 'absolute', inset: 0 }}
          config={{
            youtube: { playerVars: { showinfo: 1, modestbranding: 1, cc_load_policy: 1, cc_lang_pref: 'en', enablejsapi: 1 } },
          }}
        />

        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            onClick={() => {
              const nextPlaying = !playing;
              setPlaying(nextPlaying);
              if (mode === 'controller') {
                pushImmediate({ currentTime, playing: nextPlaying });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>

          {currentSegmentIdx < normalizedSegments.length - 1 && (
            <button
              onClick={() => jumpToSegment(currentSegmentIdx + 1, false)}
              className="px-3 py-2 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur transition"
            >
              Next
            </button>
          )}
        </div>

        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
        >
          {panelOpen ? <X className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
          {panelOpen ? 'Hide Segments' : `Segments (${normalizedSegments.length})`}
        </button>

        <div
          className={`absolute top-0 right-0 z-10 h-full w-72 max-w-[85%] bg-slate-950/95 backdrop-blur-md border-l border-white/10 transition-transform duration-300 ${
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white">Segments</h3>
              <p className="text-xs text-slate-400">Active segment stays highlighted while playing</p>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-[calc(100%-61px)] overflow-y-auto p-3 space-y-2">
            {normalizedSegments.map((seg, idx) => (
              <button
                key={idx}
                ref={(el) => {
                  segmentItemRefs.current[idx] = el;
                }}
                className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                  idx === currentSegmentIdx
                    ? 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                }`}
                onClick={() => jumpToSegment(idx, false)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Segment {idx + 1}</span>
                  <span className="text-xs text-slate-400">{seg.start} → {seg.end}</span>
                </div>
                {seg.label && <div className="mt-1 text-xs text-slate-300 italic">{seg.label}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}