import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';
import VideoClipProgressBars from '@/components/attorneyView/VideoClipProgressBars.jsx';
import { getItemAnchorTime, getNextPlayableIndex, isPauseItem, isSegmentItem, normalizeVideoClipItems, timeToSeconds } from '@/lib/videoClipPlaylist';

export default function VideoClipController({ videoUrl, segments = [], onStateChange }) {
  const playerRef = useRef(null);
  const segmentItemRefs = useRef({});
  const suppressEndCheckRef = useRef(false);
  const resumeTimeoutRef = useRef(null);
  const items = useMemo(() => normalizeVideoClipItems(segments), [segments]);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const seekToItem = useCallback((idx, options = {}) => {
    const item = items[idx];
    if (!item) return;

    const shouldResume = !!options.resume && isSegmentItem(item);
    const targetTime = isPauseItem(item) ? getItemAnchorTime(items, idx) : timeToSeconds(item.start);

    clearResumeTimeout();
    suppressEndCheckRef.current = true;
    setCurrentSegmentIdx(idx);
    setCurrentTime(targetTime);
    setPlaying(shouldResume);
    playerRef.current?.seekTo?.(targetTime, 'seconds');

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

    const currentItem = items[currentSegmentIdx];
    if (!currentItem || isPauseItem(currentItem)) return;

    const endSec = timeToSeconds(currentItem.end);
    if (currentTime < endSec - 0.05) return;

    if (currentSegmentIdx < items.length - 1) {
      const nextIndex = currentSegmentIdx + 1;
      seekToItem(nextIndex, { resume: !isPauseItem(items[nextIndex]) });
      return;
    }

    setCurrentTime(endSec);
    setPlaying(false);
  }, [currentTime, currentSegmentIdx, items, seekToItem]);

  useEffect(() => {
    onStateChange?.({ currentTime, playing });
  }, [currentTime, playing, onStateChange]);

  if (!items.length || !items.some((item) => isSegmentItem(item))) {
    return <div className="text-slate-500 italic">No segments</div>;
  }

  const currentItem = items[currentSegmentIdx] || items[0];
  const nextPlayableIndex = isPauseItem(currentItem) ? getNextPlayableIndex(items, currentSegmentIdx) : -1;

  const handlePlayToggle = () => {
    if (isPauseItem(currentItem)) {
      if (nextPlayableIndex >= 0) {
        seekToItem(nextPlayableIndex, { resume: true });
      }
      return;
    }
    setPlaying((value) => !value);
  };

  const handleNext = () => {
    if (currentSegmentIdx >= items.length - 1) return;
    const nextIndex = currentSegmentIdx + 1;
    seekToItem(nextIndex, { resume: !isPauseItem(items[nextIndex]) });
  };

  return (
    <div className="space-y-3">
      <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video border border-slate-200">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          controls
          playing={playing}
          onPlay={() => {
            if (!isPauseItem(currentItem)) setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onDuration={(duration) => setVideoDuration(duration)}
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
            const startSec = getItemAnchorTime(items, currentSegmentIdx);
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
            onClick={handlePlayToggle}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPauseItem(currentItem) ? 'Resume' : playing ? 'Pause' : 'Play'}
          </button>

          {currentSegmentIdx < items.length - 1 && (
            <button
              onClick={handleNext}
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
              <p className="text-xs text-slate-400">Attorney preview keeps autoplay and stops at pause items</p>
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
                  segmentItemRefs.current[idx] = el;
                }}
                className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                  idx === currentSegmentIdx
                    ? 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                }`}
                onClick={() => seekToItem(idx, { resume: isSegmentItem(item) })}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.label || (isPauseItem(item) ? `Pause ${idx + 1}` : `Segment ${idx + 1}`)}</span>
                  <span className="text-xs text-slate-400">{isPauseItem(item) ? 'Manual pause' : `${item.start} → ${item.end}`}</span>
                </div>
                {isPauseItem(item) && <div className="mt-1 text-xs text-amber-300 italic">Playback stops here until resumed.</div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <VideoClipProgressBars
        segments={items}
        currentSegmentIdx={currentSegmentIdx}
        currentTime={currentTime}
        videoDuration={videoDuration}
      />
    </div>
  );
}