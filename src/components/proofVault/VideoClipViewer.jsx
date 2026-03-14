import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';

export default function VideoClipViewer({ videoUrl, segments }) {
  const playerRef = useRef(null);
  const shouldAutoResumeRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [segmentsOpen, setSegmentsOpen] = useState(true);

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

  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };

  const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!segments || segments.length === 0) {
    return <div className="text-slate-500 italic">No segments</div>;
  }

  const segment = segments[currentSegmentIdx];
  const startSec = timeToSeconds(segment.start);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {/* Video player */}
      <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex-1 min-h-[240px]">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          controls
          playing={playing}
          onProgress={(state) => setCurrentTime(state.playedSeconds)}
          onReady={() => playerRef.current?.seekTo(startSec)}
          config={{
            youtube: { playerVars: { showinfo: 1, modestbranding: 1, cc_load_policy: 1 } },
          }}
        />
      </div>

      {/* Segment indicator */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-700">
          <span className="font-semibold">Segment {currentSegmentIdx + 1} of {segments.length}</span>
          <span className="ml-3 text-slate-600">
            {segment.start} → {segment.end}
            {segment.label && <span className="ml-2 italic text-slate-500">({segment.label})</span>}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          {currentSegmentIdx < segments.length - 1 && (
            <button
              onClick={() => {
                setCurrentSegmentIdx(currentSegmentIdx + 1);
                setPlaying(false);
              }}
              className="px-3 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition"
            >
              Next Segment
            </button>
          )}
        </div>
      </div>

      {/* Segments list */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => setSegmentsOpen((open) => !open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition"
        >
          <div className="text-sm font-medium text-slate-700">
            Playlist Segments ({segments.length})
          </div>
          {segmentsOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {segmentsOpen && (
          <div className="max-h-[32vh] overflow-y-auto p-2 space-y-1 border-t border-slate-200">
            {segments.map((seg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md text-xs cursor-pointer transition ${
                  idx === currentSegmentIdx
                    ? 'bg-blue-100 text-blue-900 font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => {
                  setCurrentSegmentIdx(idx);
                  setPlaying(false);
                }}
              >
                #{idx + 1} · {seg.start} → {seg.end}
                {seg.label && <span className="ml-2 italic text-slate-600">({seg.label})</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}