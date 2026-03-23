import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { getPlayableRanges, normalizeVideoClipItems } from '@/lib/videoClipPlaylist';

function clampToRanges(time, ranges) {
  if (!ranges.length) return Math.max(0, time || 0);
  const raw = typeof time === 'number' ? time : ranges[0].start;

  for (const range of ranges) {
    if (raw >= range.start - 0.25 && raw <= range.end + 0.25) {
      return Math.min(Math.max(raw, range.start), range.end);
    }
    if (raw < range.start) return range.start;
  }

  return ranges[ranges.length - 1].end;
}

function getActiveRange(time, ranges) {
  if (!ranges.length) return null;
  return ranges.find((range) => time >= range.start - 0.25 && time <= range.end + 0.25) || ranges[0];
}

export default function JurySyncedVideoPlayer({ src, videoTime, isPlaying, segments = null }) {
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [segmentEnded, setSegmentEnded] = useState(false);
  const items = useMemo(() => normalizeVideoClipItems(segments || []), [segments]);
  const ranges = useMemo(() => getPlayableRanges(items), [items]);
  const targetTime = ranges.length ? clampToRanges(videoTime, ranges) : (videoTime ?? 0);
  const activeRange = getActiveRange(targetTime, ranges);
  const playing = !!isPlaying && !segmentEnded;

  useEffect(() => {
    setIsReady(false);
    setSegmentEnded(false);
  }, [src]);

  useEffect(() => {
    if (!activeRange) {
      setSegmentEnded(false);
      return;
    }
    if (!isPlaying || targetTime < activeRange.end - 0.15) {
      setSegmentEnded(false);
    }
  }, [activeRange, isPlaying, targetTime]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;
    const currentTime = player.getCurrentTime?.() ?? 0;
    const driftThreshold = playing ? 2.5 : 0.35;
    if (Math.abs(currentTime - targetTime) > driftThreshold) {
      player.seekTo?.(targetTime, 'seconds');
    }
  }, [targetTime, playing, isReady]);

  if (!src) {
    return <div className="flex items-center justify-center w-full h-full bg-black text-white/20">No video attached</div>;
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <div className="w-full h-full max-w-full max-h-full">
        <ReactPlayer
          ref={playerRef}
          url={src}
          playing={playing}
          muted
          controls={false}
          width="100%"
          height="100%"
          playsinline
          onReady={() => {
            setIsReady(true);
            playerRef.current?.seekTo(targetTime, 'seconds');
          }}
          onProgress={({ playedSeconds }) => {
            if (activeRange && playedSeconds > activeRange.end + 0.15) {
              setSegmentEnded(true);
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