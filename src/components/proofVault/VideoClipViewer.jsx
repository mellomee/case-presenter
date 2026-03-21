import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';
import { getNextPlayableItemIndex, normalizeVideoClipItems, timeToSeconds } from '@/components/proofVault/videoClipPlaylistUtils.js';

export default function VideoClipViewer({ videoUrl, segments = [] }) {
  const items = useMemo(() => normalizeVideoClipItems(segments), [segments]);
  const playerRef = useRef(null);
  const itemRefs = useRef({});
  const suppressEndCheckRef = useRef(false);
  const resumeTimeoutRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [pausedForBreak, setPausedForBreak] = useState(false);

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const seekToItem = useCallback((idx, options = {}) => {
    const item = items[idx];
    if (!item) return;

    clearResumeTimeout();
    suppressEndCheckRef.current = true;
    setCurrentItemIdx(idx);
    setPausedForBreak(Boolean(options.pausedForBreak) || item.item_type === 'pause');

    if (item.item_type === 'pause') {
      setPlaying(false);
      resumeTimeoutRef.current = setTimeout(() => {
        suppressEndCheckRef.current = false;
      }, 140);
      return;
    }

    const startSec = timeToSeconds(item.start);
    setCurrentTime(startSec);
    setPlaying(Boolean(options.resume));
    playerRef.current?.seekTo(startSec, 'seconds');

    resumeTimeoutRef.current = setTimeout(() => {
      suppressEndCheckRef.current = false;
    }, 140);
  }, [items, clearResumeTimeout]);

  useEffect(() => () => clearResumeTimeout(), [clearResumeTimeout]);

  useEffect(() => {
    if (items.length === 0) return;
    const safeIndex = Math.min(currentItemIdx, items.length - 1);
    seekToItem(safeIndex, { resume: false, pausedForBreak: items[safeIndex]?.item_type === 'pause' });
  }, [items, seekToItem]);

  useEffect(() => {
    if (!panelOpen) return;
    const activeItem = itemRefs.current[currentItemIdx];
    if (!activeItem) return;

    const timeout = setTimeout(() => {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    return () => clearTimeout(timeout);
  }, [currentItemIdx, panelOpen]);

  useEffect(() => {
    const currentItem = items[currentItemIdx];
    if (!currentItem || currentItem.item_type === 'pause' || suppressEndCheckRef.current) return;

    const endSec = timeToSeconds(currentItem.end);
    if (currentTime >= endSec - 0.05) {
      const nextIndex = currentItemIdx + 1;
      if (nextIndex < items.length) {
        const nextItem = items[nextIndex];
        if (nextItem.item_type === 'pause') {
          seekToItem(nextIndex, { resume: false, pausedForBreak: true });
        } else {
          seekToItem(nextIndex, { resume: true, pausedForBreak: false });
        }
      } else {
        setCurrentTime(endSec);
        setPlaying(false);
        setPausedForBreak(false);
      }
    }
  }, [currentTime, currentItemIdx, items, seekToItem]);

  if (items.length === 0) {
    return <div className="text-slate-500 italic">No playlist items</div>;
  }

  const nextPlayableIndex = getNextPlayableItemIndex(items, currentItemIdx);
  const currentItem = items[currentItemIdx];

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
          onPlay={() => {
            setPlaying(true);
            setPausedForBreak(false);
          }}
          onPause={() => setPlaying(false)}
          onSeek={(seconds) => {
            const matchingIndex = items.findIndex((item) => {
              if (item.item_type === 'pause') return false;
              const start = timeToSeconds(item.start);
              const end = timeToSeconds(item.end);
              return seconds >= start && seconds <= end;
            });

            if (matchingIndex >= 0 && matchingIndex !== currentItemIdx) {
              setCurrentItemIdx(matchingIndex);
            }

            setCurrentTime(seconds);
            setPausedForBreak(false);
          }}
          onProgress={(state) => {
            if (!suppressEndCheckRef.current) {
              setCurrentTime(state.playedSeconds);
            }
          }}
          onReady={() => {
            const firstPlayable = items.find((item) => item.item_type !== 'pause');
            if (!firstPlayable) return;
            const startSec = timeToSeconds(firstPlayable.start);
            playerRef.current?.seekTo(startSec, 'seconds');
            setCurrentTime(startSec);
          }}
          config={{
            youtube: { playerVars: { showinfo: 1, modestbranding: 1, cc_load_policy: 1 } },
          }}
        />

        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            onClick={() => {
              if (currentItem?.item_type === 'pause') {
                if (nextPlayableIndex >= 0) {
                  seekToItem(nextPlayableIndex, { resume: true, pausedForBreak: false });
                }
                return;
              }
              if (playing) {
                setPlaying(false);
                return;
              }
              setPausedForBreak(false);
              setPlaying(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {currentItem?.item_type === 'pause' ? 'Continue' : playing ? 'Pause' : 'Play'}
          </button>

          {nextPlayableIndex >= 0 && (
            <button
              onClick={() => seekToItem(nextPlayableIndex, { resume: true, pausedForBreak: false })}
              className="px-3 py-2 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur transition"
            >
              Next
            </button>
          )}
        </div>

        {pausedForBreak && currentItem?.item_type === 'pause' && (
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-full bg-black/75 px-4 py-2 text-xs font-medium text-white backdrop-blur">
              <span>Paused playlist</span>
              {nextPlayableIndex >= 0 && (
                <button
                  onClick={() => seekToItem(nextPlayableIndex, { resume: true, pausedForBreak: false })}
                  className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
                >
                  Continue
                </button>
              )}
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
              <p className="text-xs text-slate-400">Drag in pause blocks between segments.</p>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-[calc(100%-61px)] overflow-y-auto p-3 space-y-2">
            {items.map((item, idx) => (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                  idx === currentItemIdx
                    ? 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                }`}
                onClick={() => seekToItem(idx, { resume: false, pausedForBreak: item.item_type === 'pause' })}
              >
                {item.item_type === 'pause' ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-amber-200">Pause Block</span>
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">Stop</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Segment {idx + 1}</span>
                      <span className="text-xs text-slate-400">{item.start} → {item.end}</span>
                    </div>
                    {item.label && <div className="mt-1 text-xs text-slate-300 italic">{item.label}</div>}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}