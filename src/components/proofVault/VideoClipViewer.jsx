import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, List, X } from 'lucide-react';

export default function VideoClipViewer({ videoUrl, segments }) {
  const playerRef = useRef(null);
  const shouldAutoResumeRef = useRef(false);
  const segmentItemRefs = useRef({});
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };

  useEffect(() => {
    if (segments.length === 0) return;
    const startSec = timeToSeconds(segments[currentSegmentIdx].start);
    playerRef.current?.seekTo(startSec, 'seconds');
    setCurrentTime(startSec);

    if (shouldAutoResumeRef.current) {
      const timeout = setTimeout(() => {
        setPlaying(true);
        shouldAutoResumeRef.current = false;
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [currentSegmentIdx, segments]);

  useEffect(() => {
    if (!panelOpen) return;
    const activeItem = segmentItemRefs.current[currentSegmentIdx];
    if (!activeItem) return;

    const timeout = setTimeout(() => {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    return () => clearTimeout(timeout);
  }, [currentSegmentIdx, panelOpen]);

  // Auto-play segments in sequence
  useEffect(() => {
    if (segments.length === 0) return;

    const segment = segments[currentSegmentIdx];
    const endSec = timeToSeconds(segment.end);

    if (currentTime >= endSec) {
      if (currentSegmentIdx < segments.length - 1) {
        shouldAutoResumeRef.current = true;
        setPlaying(false);
        setCurrentSegmentIdx((idx) => idx + 1);
      } else {
        setPlaying(false);
      }
    }
  }, [currentTime, currentSegmentIdx, segments]);

  if (!segments || segments.length === 0) {
    return <div className="text-slate-500 italic">No segments</div>;
  }

  const segment = segments[currentSegmentIdx];
  const startSec = timeToSeconds(segment.start);

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
          onProgress={(state) => setCurrentTime(state.playedSeconds)}
          onReady={() => playerRef.current?.seekTo(startSec, 'seconds')}
          config={{
            youtube: { playerVars: { showinfo: 1, modestbranding: 1, cc_load_policy: 1 } },
          }}
        />

        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur transition"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>

          {currentSegmentIdx < segments.length - 1 && (
            <button
              onClick={() => {
                setCurrentSegmentIdx(currentSegmentIdx + 1);
                setPlaying(false);
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
                onClick={() => {
                  setCurrentSegmentIdx(idx);
                  setPlaying(false);
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
      </div>
    </div>
  );
}