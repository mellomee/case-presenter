import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause } from 'lucide-react';

export default function VideoClipViewer({ videoUrl, segments }) {
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Seek to start of current segment when segment changes
  useEffect(() => {
    if (segments.length === 0 || !playerRef.current) return;
    const startSec = timeToSeconds(segments[currentSegmentIdx].start);
    playerRef.current.seekTo(startSec, 'seconds');
  }, [currentSegmentIdx, segments]);

  // Auto-advance to next segment when current segment ends
  useEffect(() => {
    if (segments.length === 0 || !playing) return;

    const segment = segments[currentSegmentIdx];
    const endSec = timeToSeconds(segment.end);

    // Check if we've reached the end of current segment
    if (currentTime >= endSec) {
      if (currentSegmentIdx < segments.length - 1) {
        // Move to next segment (it will auto-play due to playing state)
        setCurrentSegmentIdx(currentSegmentIdx + 1);
      } else {
        // All segments done
        setPlaying(false);
      }
    }
  }, [currentTime, currentSegmentIdx, segments, playing]);

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
    <div className="space-y-4">
      {/* Video player */}
      <div className="bg-slate-900 rounded-lg overflow-hidden aspect-video border border-slate-200">
         <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          controls
          playing={playing}
          onProgress={(state) => {
            const endSec = timeToSeconds(segments[currentSegmentIdx].end);
            if (state.playedSeconds >= endSec) {
              // Stop playback at segment end
              setPlaying(false);
            } else {
              setCurrentTime(state.playedSeconds);
            }
          }}
          onReady={() => playerRef.current?.seekTo(timeToSeconds(segments[currentSegmentIdx].start), 'seconds')}
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
                setCurrentTime(timeToSeconds(segments[currentSegmentIdx + 1].start));
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
      <div className="space-y-1">
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
               setCurrentTime(timeToSeconds(seg.start));
               playerRef.current?.seekTo(timeToSeconds(seg.start), 'seconds');
               setPlaying(false);
             }}
          >
            #{idx + 1} · {seg.start} → {seg.end}
            {seg.label && <span className="ml-2 italic text-slate-600">({seg.label})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}