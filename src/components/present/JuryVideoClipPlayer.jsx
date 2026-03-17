import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

const EDGE_TOLERANCE = 0.2;

function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number).filter((part) => !Number.isNaN(part));
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function normalizeSegments(segments) {
  return (Array.isArray(segments) ? segments : [])
    .map((segment, index) => ({
      ...segment,
      index,
      startSec: timeToSeconds(segment.start),
      endSec: timeToSeconds(segment.end),
    }))
    .filter((segment) => segment.endSec > segment.startSec)
    .sort((a, b) => a.startSec - b.startSec);
}

function findSegmentIndex(time, segments) {
  if (!segments.length) return 0;

  const containingIndex = segments.findIndex(
    (segment) => time >= segment.startSec - EDGE_TOLERANCE && time <= segment.endSec + EDGE_TOLERANCE
  );

  if (containingIndex >= 0) return containingIndex;

  const nextIndex = segments.findIndex((segment) => time < segment.startSec);
  return nextIndex >= 0 ? nextIndex : segments.length - 1;
}

function clampToSegment(time, segment) {
  if (!segment) return Math.max(0, time || 0);
  return Math.min(Math.max(time ?? segment.startSec, segment.startSec), Math.max(segment.startSec, segment.endSec - 0.05));
}

export default function JuryVideoClipPlayer({ src, segments, videoTime = 0, isPlaying = false }) {
  const playerRef = useRef(null);
  const normalizedSegments = useMemo(() => normalizeSegments(segments), [segments]);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const [clipEnded, setClipEnded] = useState(false);

  useEffect(() => {
    if (!normalizedSegments.length) {
      setClipEnded(false);
      return;
    }

    const targetIndex = findSegmentIndex(videoTime ?? normalizedSegments[0].startSec, normalizedSegments);
    const targetSegment = normalizedSegments[targetIndex];
    const targetTime = clampToSegment(videoTime, targetSegment);
    const currentTime = playerRef.current?.getCurrentTime?.() ?? 0;

    if (clipEnded && targetTime < normalizedSegments[normalizedSegments.length - 1].endSec - EDGE_TOLERANCE) {
      setClipEnded(false);
    }

    if (targetIndex !== activeSegmentIdx) {
      setActiveSegmentIdx(targetIndex);
    }

    if (Math.abs(currentTime - targetTime) > 0.75) {
      playerRef.current?.seekTo(targetTime, 'seconds');
    }
  }, [videoTime, src, normalizedSegments, activeSegmentIdx, clipEnded]);

  const handleProgress = ({ playedSeconds }) => {
    if (!normalizedSegments.length) return;

    const activeSegment = normalizedSegments[activeSegmentIdx];
    if (!activeSegment) return;

    if (playedSeconds < activeSegment.startSec - 0.75 || playedSeconds > activeSegment.endSec + EDGE_TOLERANCE) {
      const targetIndex = findSegmentIndex(playedSeconds, normalizedSegments);
      const targetSegment = normalizedSegments[targetIndex];
      setActiveSegmentIdx(targetIndex);
      playerRef.current?.seekTo(clampToSegment(playedSeconds, targetSegment), 'seconds');
      return;
    }

    if (playedSeconds >= activeSegment.endSec - 0.05) {
      if (activeSegmentIdx < normalizedSegments.length - 1) {
        const nextIndex = activeSegmentIdx + 1;
        setActiveSegmentIdx(nextIndex);
        playerRef.current?.seekTo(normalizedSegments[nextIndex].startSec, 'seconds');
      } else {
        setClipEnded(true);
      }
    }
  };

  const handleReady = () => {
    if (!normalizedSegments.length) {
      playerRef.current?.seekTo(videoTime || 0, 'seconds');
      return;
    }

    const targetIndex = findSegmentIndex(videoTime ?? normalizedSegments[0].startSec, normalizedSegments);
    const targetSegment = normalizedSegments[targetIndex];
    playerRef.current?.seekTo(clampToSegment(videoTime, targetSegment), 'seconds');
  };

  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <div className="w-full h-full max-w-full max-h-full">
        <ReactPlayer
          ref={playerRef}
          url={src}
          playing={isPlaying && !clipEnded}
          controls={false}
          width="100%"
          height="100%"
          playsinline
          onReady={handleReady}
          onProgress={handleProgress}
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