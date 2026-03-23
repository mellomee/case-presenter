import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';
import VideoClipProgressBars from '@/components/attorneyView/VideoClipProgressBars.jsx';
import {
  getItemAnchorTime,
  getNextPlayableIndex,
  isPauseItem,
  normalizeVideoClipItems,
  timeToSeconds,
} from '@/lib/videoClipPlaylist';

export default function VideoClipController({ videoUrl, segments = [], onStateChange }) {
  const playerRef = useRef(null);
  const segmentItemRefs = useRef({});
  const suppressEndCheckRef = useRef(false);
  const resumeTimeoutRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

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
    const anchorTime = isPauseItem(item) ? getItemAnchorTime(items, idx) : timeToSeconds(item.start);

    clearResumeTimeout();
    suppressEndCheckRef.current = true;
    setCurrentSegmentIdx(idx);
    setCurrentTime(anchorTime);
    setPlaying(shouldResume);
    playerRef.current?.seekTo(anchorTime, 'seconds');
    onStateChange?.({ currentTime: anchorTime, playing: shouldResume });

    resumeTimeoutRef.current = setTimeout(() => {
      suppressEndCheckRef.current = false;
    }, 140);
  }, [items, clearResumeTimeout, onStateChange]);

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
    const currentItem = items[currentSegmentIdx];
    if (!currentItem || isPauseItem(currentItem) || suppressEndCheckRef.current) return;

    const endSec = timeToSeconds(currentItem.end);
    if (currentTime >= endSec - 0.05) {
      if (currentSegmentIdx < items.length - 1) {
        const nextItem = items[currentSegmentIdx + 1];
        seekToItem(currentSegmentIdx + 1, { resume: !isPauseItem(nextItem) });
      } else {
        setCurrentTime(endSec);
        setPlaying(false);
        onStateChange?.({ currentTime: endSec, playing: false });
      }
    }
  }, [currentTime, currentSegmentIdx, items, seekToItem]);

  if (!items.length) {
    return <div className="text-slate-500 italic">No segments</div>;
  }

  const currentItem = items[currentSegmentIdx];
  const hasNextItem = currentSegmentIdx < items.length - 1;
  const playLabel = isPauseItem(currentItem) ? 'Resume' : (playing ? 'Pause' : 'Play');

  const handlePlayToggle = () => {
    if (isPauseItem(currentItem)) {
      const nextPlayableIndex = getNextPlayableIndex(items, currentSegmentIdx);
      if (nextPlayableIndex >= 0) {
        seekToItem(nextPlayableIndex, { resume: true });
      }
      return;
    }

    const nextPlaying = !playing;
    setPlaying(nextPlaying);
    onStateChange?.({ currentTime, playing: nextPlaying });
  };

  const handleNext = () => {
    if (!hasNextItem) return;
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
            if (isPauseItem(currentItem)) return;
            setPlaying(true);
            onStateChange?.({ currentTime, playing: true });
          }}
          onPause={() => {
            setPlaying(false);
            onStateChange?.({ currentTime, playing: false });
          }}
          onDuration={(duration) => setVideoDuration(duration)}
          onSeek={(seconds) => {
            const matchingIndex = items.findIndex((item) => !isPauseItem(item) && seconds >= timeToSeconds(item.start) && seconds <= timeToSeconds(item.end));
            if (matchingIndex >= 0 && matchingIndex !== currentSegmentIdx) {
              setCurrentSegmentIdx(matchingIndex);
            }
            setCurrentTime(seconds);
            onStateChange?.({ currentTime: seconds, playing });
          }}
          onProgress={(state) => {
            if (!suppressEndCheckRef.current) {
              setCurrentTime(state.playedSeconds);
            }
          }}
          onReady={() => {
            const anchorTime = getItemAnchorTime(items, currentSegmentIdx);
            playerRef.current?.seekTo(anchorTime, 'seconds');
            setCurrentTime(anchorTime);
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
            {playing && !isPauseItem(currentItem) ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playLabel}
          </button>

          {hasNextItem && (
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
              <p className="text-xs text-slate-400">Pause items stop playback until you resume</p>
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
              const pauseItem = isPauseItem(item);
              return (
                <button
                  key={item.id || idx}
                  ref={(el) => {
                    segmentItemRefs.current[idx] = el;
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    idx === currentSegmentIdx
                      ? 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                  onClick={() => seekToItem(idx, { resume: false })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{pauseItem ? `Pause ${idx + 1}` : `Segment ${idx + 1}`}</span>
                    <span className="text-xs text-slate-400">{pauseItem ? 'Manual pause' : `${item.start} → ${item.end}`}</span>
                  </div>
                  {item.label && <div className="mt-1 text-xs text-slate-300 italic">{item.label}</div>}
                </button>
              );
            })}
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