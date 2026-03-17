import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';
import VideoClipProgressBars from '@/components/attorneyView/VideoClipProgressBars.jsx';

function timeToSeconds(timeStr) {
  const parts = String(timeStr || '0:00:00').split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

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

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const seekToSegment = useCallback((idx, options = {}) => {
    const segment = segments[idx];
    if (!segment) return;

    const startSec = timeToSeconds(segment.start);
    const shouldResume = !!options.resume;

    clearResumeTimeout();
    suppressEndCheckRef.current = true;
    setCurrentSegmentIdx(idx);
    setCurrentTime(startSec);
    setPlaying(false);
    playerRef.current?.seekTo(startSec, 'seconds');

    resumeTimeoutRef.current = setTimeout(() => {
      suppressEndCheckRef.current = false;
      if (shouldResume) {
        setPlaying(true);
      }
    }, 140);
  }, [segments, clearResumeTimeout]);

  useEffect(() => () => clearResumeTimeout(), [clearResumeTimeout]);

  useEffect(() => {
    if (segments.length === 0) return;
    const safeIndex = Math.min(currentSegmentIdx, segments.length - 1);
    seekToSegment(safeIndex, { resume: false });
  }, [segments, seekToSegment]);

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
    if (segments.length === 0 || suppressEndCheckRef.current) return;

    const segment = segments[currentSegmentIdx];
    const endSec = timeToSeconds(segment.end);

    if (currentTime >= endSec - 0.05) {
      if (currentSegmentIdx < segments.length - 1) {
        seekToSegment(currentSegmentIdx + 1, { resume: true });
      } else {
        setCurrentTime(endSec);
        setPlaying(false);
      }
    }
  }, [currentTime, currentSegmentIdx, segments, seekToSegment]);

  useEffect(() => {
    onStateChange?.({ currentTime, playing });
  }, [currentTime, playing, onStateChange]);

  if (!segments || segments.length === 0) {
    return <div className="text-slate-500 italic">No segments</div>;
  }

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
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onDuration={(duration) => setVideoDuration(duration)}
          onSeek={(seconds) => {
            const matchingIndex = segments.findIndex((segment) => {
              const start = timeToSeconds(segment.start);
              const end = timeToSeconds(segment.end);
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
            const startSec = timeToSeconds(segments[currentSegmentIdx]?.start);
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
            onClick={() => setPlaying((value) => !value)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>

          {currentSegmentIdx < segments.length - 1 && (
            <button
              onClick={() => seekToSegment(currentSegmentIdx + 1, { resume: true })}
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
          {panelOpen ? 'Hide Segments' : `Segments (${segments.length})`}
        </button>

        <div
          className={`absolute top-0 right-0 z-10 h-full w-full max-w-sm bg-slate-950/95 backdrop-blur-md border-l border-white/10 transition-transform duration-300 ${
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white">Segments</h3>
              <p className="text-xs text-slate-400">Click any segment to jump and resume playback</p>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-[calc(100%-61px)] overflow-y-auto p-3 space-y-2">
            {segments.map((seg, idx) => (
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
                onClick={() => seekToSegment(idx, { resume: true })}
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

      <VideoClipProgressBars
        segments={segments}
        currentSegmentIdx={currentSegmentIdx}
        currentTime={currentTime}
        videoDuration={videoDuration}
      />
    </div>
  );
}