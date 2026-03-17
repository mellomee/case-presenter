import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';

function timeToSeconds(timeValue) {
  if (typeof timeValue === 'number') return timeValue;
  if (!timeValue || typeof timeValue !== 'string') return 0;

  const parts = timeValue.split(':').map(Number);
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function normalizeSegments(value) {
  const parsed = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      })()
    : value;

  return (Array.isArray(parsed) ? parsed : []).map((segment, index) => ({
    ...segment,
    startSeconds: timeToSeconds(segment.start),
    endSeconds: timeToSeconds(segment.end),
    _index: index,
  }));
}

export default function VideoClipViewer({ videoUrl, segments, mode = 'controller', syncState, onStateChange }) {
  const playerRef = useRef(null);
  const shouldAutoResumeRef = useRef(false);
  const segmentItemRefs = useRef({});
  const normalizedSegments = useMemo(() => normalizeSegments(segments), [segments]);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const pushSyncState = useCallback((overrides = {}) => {
    if (mode !== 'controller' || !onStateChange) return;
    onStateChange({
      currentTime,
      playing,
      currentSegmentIdx,
      ...overrides,
    });
  }, [mode, onStateChange, currentTime, playing, currentSegmentIdx]);

  useEffect(() => {
    setCurrentSegmentIdx(0);
    setCurrentTime(normalizedSegments[0]?.startSeconds || 0);
    setPlaying(false);
  }, [normalizedSegments]);

  useEffect(() => {
    if (normalizedSegments.length === 0) return;
    const safeIndex = Math.min(currentSegmentIdx, normalizedSegments.length - 1);
    const startSec = normalizedSegments[safeIndex]?.startSeconds || 0;
    playerRef.current?.seekTo(startSec, 'seconds');
    setCurrentTime(startSec);
    pushSyncState({ currentTime: startSec, currentSegmentIdx: safeIndex });

    if (shouldAutoResumeRef.current) {
      const timeout = setTimeout(() => {
        setPlaying(true);
        pushSyncState({ currentTime: startSec, currentSegmentIdx: safeIndex, playing: true });
        shouldAutoResumeRef.current = false;
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [currentSegmentIdx, normalizedSegments, pushSyncState]);

  useEffect(() => {
    if (mode !== 'viewer' || !syncState || normalizedSegments.length === 0) return;

    const nextSegmentIdx = Math.min(
      Math.max(syncState.currentSegmentIdx ?? 0, 0),
      normalizedSegments.length - 1
    );

    if (nextSegmentIdx !== currentSegmentIdx) {
      setCurrentSegmentIdx(nextSegmentIdx);
    }

    const nextPlaying = !!syncState.playing;
    if (nextPlaying !== playing) {
      setPlaying(nextPlaying);
    }

    const nextTime = syncState.currentTime ?? normalizedSegments[nextSegmentIdx]?.startSeconds ?? 0;
    const player = playerRef.current;
    const playerTime = player?.getCurrentTime?.() ?? 0;
    if (Math.abs(playerTime - nextTime) > 1.2) {
      player?.seekTo?.(nextTime, 'seconds');
      setCurrentTime(nextTime);
    }
  }, [mode, syncState, normalizedSegments, currentSegmentIdx, playing]);

  useEffect(() => {
    if (!panelOpen || mode !== 'controller') return;
    const activeItem = segmentItemRefs.current[currentSegmentIdx];
    if (!activeItem) return;

    const timeout = setTimeout(() => {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    return () => clearTimeout(timeout);
  }, [currentSegmentIdx, panelOpen, mode]);

  useEffect(() => {
    if (normalizedSegments.length === 0) return;

    const segment = normalizedSegments[currentSegmentIdx];
    if (!segment) return;

    if (currentTime >= segment.endSeconds && segment.endSeconds > segment.startSeconds) {
      if (currentSegmentIdx < normalizedSegments.length - 1) {
        shouldAutoResumeRef.current = playing;
        setPlaying(false);
        setCurrentSegmentIdx((idx) => idx + 1);
      } else if (playing) {
        setPlaying(false);
        pushSyncState({ playing: false });
      }
    }
  }, [currentTime, currentSegmentIdx, normalizedSegments, playing, pushSyncState]);

  if (!normalizedSegments.length) {
    return <div className="text-slate-500 italic">No segments</div>;
  }

  const segment = normalizedSegments[currentSegmentIdx] || normalizedSegments[0];
  const startSec = segment?.startSeconds || 0;
  const showControllerChrome = mode === 'controller';

  return (
    <div className="relative h-full">
      <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video border border-slate-200 h-full">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          controls={showControllerChrome}
          playing={playing}
          onProgress={(state) => {
            setCurrentTime(state.playedSeconds);
            if (mode === 'controller') {
              onStateChange?.({
                currentTime: state.playedSeconds,
                playing,
                currentSegmentIdx,
              });
            }
          }}
          onReady={() => playerRef.current?.seekTo(startSec, 'seconds')}
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
                cc_load_policy: 1,
                cc_lang_pref: 'en',
                enablejsapi: 1,
              },
            },
          }}
        />

        {showControllerChrome && (
          <>
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <button
                onClick={() => {
                  const nextPlaying = !playing;
                  setPlaying(nextPlaying);
                  pushSyncState({ playing: nextPlaying });
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? 'Pause' : 'Play'}
              </button>

              {currentSegmentIdx < normalizedSegments.length - 1 && (
                <button
                  onClick={() => {
                    setCurrentSegmentIdx(currentSegmentIdx + 1);
                    setPlaying(false);
                    pushSyncState({ currentSegmentIdx: currentSegmentIdx + 1, playing: false });
                  }}
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
              className={`absolute top-0 right-0 z-10 h-full w-full max-w-sm bg-slate-950/95 backdrop-blur-md border-l border-white/10 transition-transform duration-300 ${
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
                    onClick={() => {
                      setCurrentSegmentIdx(idx);
                      setPlaying(false);
                      pushSyncState({ currentSegmentIdx: idx, playing: false, currentTime: seg.startSeconds || 0 });
                    }}
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
          </>
        )}
      </div>
    </div>
  );
}