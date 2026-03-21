import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';
import {
  getItemAnchorTime,
  getNextPlayableIndex,
  isPauseItem,
  normalizeVideoClipItems,
  timeToSeconds,
} from '@/lib/videoClipPlaylist';

export default function VideoClipViewer({ videoUrl, segments = [] }) {
  const playerRef = useRef(null);
  const segmentItemRefs = useRef({});
  const suppressEndCheckRef = useRef(false);
  const resumeTimeoutRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const items = useMemo(() => normalizeVideoClipItems(segments), [segments]);

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const seekToItem = useCallback((idx, options = {}) => {
    const item = items[idx];
    if (!item) return;

    const shouldResume = !!options.resume && !isPauseItem(item);
    const nextTime = isPauseItem(item) ? getItemAnchorTime(items, idx) : timeToSeconds(item.start);

    clearResumeTimeout();
    suppressEndCheckRef.current = true;
    setCurrentSegmentIdx(idx);
    setCurrentTime(nextTime);
    setPlaying(shouldResume);
    playerRef.current?.seekTo(nextTime, 'seconds');

    resumeTimeoutRef.current = setTimeout(() => {
      suppressEndCheckRef.current = false;
    }, 140);
  }, [items, clearResumeTimeout]);

  useEffect(() => () => clearResumeTimeout(), [clearResumeTimeout]);

  useEffect(() => {
    if (items.length === 0) return;
    const safeIndex = Math.min(currentSegmentIdx, items.length - 1);
    seekToItem(safeIndex, { resume: false });
  }, [items, seekToItem]);

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
    if (items.length === 0 || suppressEndCheckRef.current) return;

    const item = items[currentSegmentIdx];
    if (!item || isPauseItem(item)) return;

    const endSec = timeToSeconds(item.end);

    if (currentTime >= endSec - 0.05) {
      if (currentSegmentIdx < items.length - 1) {
        const nextIndex = currentSegmentIdx + 1;
        seekToItem(nextIndex, { resume: !isPauseItem(items[nextIndex]) });
      } else {
        setCurrentTime(endSec);
        setPlaying(false);
      }
    }
  }, [currentTime, currentSegmentIdx, items, seekToItem]);

  if (!items.length) {
    return <div className="text-slate-500 italic">No segments</div>;
  }

  const currentItem = items[currentSegmentIdx];
  const currentIsPause = isPauseItem(currentItem);
  const nextPlayableIndex = currentIsPause ? getNextPlayableIndex(items, currentSegmentIdx) : -1;

  return (
    <div className="relative">
      <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video border border-slate-200">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          controls
          playing={playing}
          onPlay={() => !currentIsPause && setPlaying(true)}
          onPause={() => setPlaying(false)}
          onSeek={(seconds) => {
            const matchingIndex = items.findIndex((item) => {
              if (isPauseItem(item)) return false;
              const start = timeToSeconds(item.start);
              const end = timeToSeconds(item.end);
              return seconds >= start && seconds <= end;
            });

            if (matchingIndex >= 0 && matchingIndex !== currentSegmentIdx) {
              setCurrentSegmentIdx(matchingIndex);
            }

            setCurrentTime(seconds);
          }}
          onProgress={(state) => {
            if (!suppressEndCheckRef.current) {
              setCurrentTime(state.playedSeconds);
            }
          }}
          onReady={() => {
            const startSec = currentIsPause ? getItemAnchorTime(items, currentSegmentIdx) : timeToSeconds(currentItem?.start);
            playerRef.current?.seekTo(startSec, 'seconds');
            setCurrentTime(startSec);
          }}
          config={{
            youtube: {
              playerVars: {
                showinfo: 1,
                modestbranding: 1,
                rel: 0,
                cc_load_policy: 1,
                cc_lang_pref: 'en',
                enablejsapi: 1,
              },
            },
          }}
        />

        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            onClick={() => {
              if (currentIsPause) {
                if (nextPlayableIndex >= 0) {
                  seekToItem(nextPlayableIndex, { resume: true });
                }
                return;
              }
              setPlaying((value) => !value);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {currentIsPause ? 'Resume' : playing ? 'Pause' : 'Play'}
          </button>

          {currentSegmentIdx < items.length - 1 && (
            <button
              onClick={() => {
                const nextIndex = currentSegmentIdx + 1;
                seekToItem(nextIndex, { resume: !isPauseItem(items[nextIndex]) });
              }}
              className="px-3 py-2 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur transition"
            >
              Next
            </button>
          )}
        </div>

        {currentIsPause && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 py-5 text-white">
            <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-sm font-semibold">{currentItem.label || 'Pause'}</div>
              <div className="mt-1 text-xs text-slate-200">Playback is paused here until you resume or jump to the next item.</div>
            </div>
          </div>
        )}

        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
        >
          {panelOpen ? <X className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
          {panelOpen ? 'Hide Playlist' : `Playlist (${items.length})`}
        </button>

        <div
          className={`absolute top-0 right-0 z-10 h-full w-full max-w-sm bg-slate-950/95 backdrop-blur-md border-l border-white/10 transition-transform duration-300 ${
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white">Playlist</h3>
              <p className="text-xs text-slate-400">Segments autoplay until they reach a pause item</p>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-[calc(100%-61px)] overflow-y-auto p-3 space-y-2">
            {items.map((item, idx) => {
              const itemIsPause = isPauseItem(item);
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    segmentItemRefs.current[idx] = el;
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    idx === currentSegmentIdx
                      ? itemIsPause
                        ? 'bg-amber-600/20 border-amber-400 text-white shadow-sm'
                        : 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                  onClick={() => seekToItem(idx, { resume: !itemIsPause })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{item.label || (itemIsPause ? `Pause ${idx + 1}` : `Segment ${idx + 1}`)}</span>
                    <span className="text-xs text-slate-400">{itemIsPause ? 'Manual pause' : `${item.start} → ${item.end}`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}