import React, { useEffect, useMemo, useRef } from 'react';
import ReactPlayer from 'react-player';

function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export default function JuryVideoClipPlayer({
  src,
  segments = [],
  videoTime = 0,
  isPlaying = false,
  clipSegmentIndex = 0,
}) {
  const playerRef = useRef(null);

  const normalizedSegments = useMemo(
    () => (Array.isArray(segments) ? segments.filter((segment) => segment?.start && segment?.end) : []),
    [segments]
  );

  const safeSegmentIndex = useMemo(() => {
    if (normalizedSegments.length === 0) return 0;
    return Math.min(Math.max(Number(clipSegmentIndex) || 0, 0), normalizedSegments.length - 1);
  }, [clipSegmentIndex, normalizedSegments.length]);

  const activeSegment = normalizedSegments[safeSegmentIndex] || null;
  const activeStart = activeSegment ? timeToSeconds(activeSegment.start) : 0;
  const activeEnd = activeSegment ? timeToSeconds(activeSegment.end) : Infinity;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const targetTime = typeof videoTime === 'number' && videoTime > 0 ? videoTime : activeStart;
    const currentTime = player.getCurrentTime?.() ?? 0;

    if (Math.abs(currentTime - targetTime) > 0.75) {
      player.seekTo?.(targetTime, 'seconds');
    }
  }, [videoTime, activeStart, safeSegmentIndex, src]);

  return (
    <div className="flex items-center justify-center w-full h-full bg-black overflow-hidden">
      <div className="w-full h-full max-w-full max-h-full">
        <ReactPlayer
          ref={playerRef}
          url={src}
          playing={isPlaying}
          controls={false}
          width="100%"
          height="100%"
          playsinline
          onReady={() => {
            const targetTime = typeof videoTime === 'number' && videoTime > 0 ? videoTime : activeStart;
            playerRef.current?.seekTo?.(targetTime, 'seconds');
          }}
          onProgress={({ playedSeconds }) => {
            if (playedSeconds > activeEnd + 0.35) {
              playerRef.current?.seekTo?.(activeEnd, 'seconds');
            }
          }}
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
      </div>
    </div>
  );
}