import React, { useEffect, useMemo, useRef, useState } from 'react';

function parseTimeValue(value) {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim();
  if (!text) return 0;
  if (!text.includes(':')) return Number(text) || 0;
  return text.split(':').reduce((total, part) => (total * 60) + (Number(part) || 0), 0);
}

export default function AttorneyCentralVideoPreview({ src, segments = [], onStateChange }) {
  const videoRef = useRef(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(segments.length > 0 ? 0 : null);

  const activeSegment = useMemo(() => {
    if (activeSegmentIndex === null) return null;
    return segments[activeSegmentIndex] || null;
  }, [segments, activeSegmentIndex]);

  useEffect(() => {
    setActiveSegmentIndex(segments.length > 0 ? 0 : null);
  }, [segments]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSegment?.start) return;
    video.currentTime = parseTimeValue(activeSegment.start);
  }, [activeSegment]);

  const emitState = () => {
    const video = videoRef.current;
    if (!video) return;
    onStateChange?.({ currentTime: video.currentTime, playing: !video.paused });
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (activeSegment?.end && video.currentTime >= parseTimeValue(activeSegment.end)) {
      video.pause();
    }
    emitState();
  };

  const jumpToSegment = (index) => {
    const video = videoRef.current;
    const segment = segments[index];
    setActiveSegmentIndex(index);
    if (!video || !segment) return;
    video.currentTime = parseTimeValue(segment.start);
    video.play();
  };

  return (
    <div className="flex h-full flex-col bg-stone-950">
      {segments.length > 0 ? (
        <div className="border-b border-stone-800 bg-stone-900/95 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {segments.map((segment, index) => {
              const isActive = activeSegmentIndex === index;
              return (
                <button
                  key={`${segment.label || 'segment'}-${index}`}
                  type="button"
                  onClick={() => jumpToSegment(index)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${isActive ? 'border-white/20 bg-white/10 text-white' : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'}`}
                >
                  {segment.label || `Clip ${index + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex-1 bg-black p-4">
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          className="h-full w-full rounded-3xl bg-black"
          onTimeUpdate={handleTimeUpdate}
          onPlay={emitState}
          onPause={emitState}
          onSeeked={emitState}
        />
      </div>
    </div>
  );
}