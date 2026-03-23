import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Volume2 } from 'lucide-react';
import { getPlayableRanges, normalizeVideoClipItems } from '@/lib/videoClipPlaylist';

function getExpectedTime(baseTime, isPlaying, updatedAt) {
  const startTime = new Date(updatedAt || Date.now()).getTime();
  const elapsed = isPlaying ? Math.max(0, (Date.now() - startTime) / 1000) : 0;
  return (baseTime || 0) + elapsed;
}

function clampToRanges(time, ranges) {
  if (!ranges.length) return Math.max(0, time || 0);
  const raw = typeof time === 'number' ? time : ranges[0].start;
  for (const range of ranges) {
    if (raw >= range.start - 0.25 && raw <= range.end + 0.25) {
      return Math.min(Math.max(raw, range.start), range.end);
    }
    if (raw < range.start) {
      return range.start;
    }
  }
  return ranges[ranges.length - 1].end;
}

function getActiveRangeIndex(time, ranges) {
  return ranges.findIndex((range) => time >= range.start - 0.25 && time <= range.end + 0.25);
}

function hasPauseBetween(items, currentRange, nextRange) {
  if (!currentRange || !nextRange) return false;
  return items.slice(currentRange.originalIndex + 1, nextRange.originalIndex).some((item) => item.type === 'pause');
}

export default function JurySyncedVideoClipPlayer({ src, segments = [], videoTime = 0, isPlaying = false, syncToken }) {
  const playerRef = useRef(null);
  const anchorRef = useRef({ time: videoTime, playing: isPlaying, updatedAt: syncToken || Date.now() });
  const [playing, setPlaying] = useState(!!isPlaying);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const items = useMemo(() => normalizeVideoClipItems(segments), [segments]);
  const ranges = useMemo(() => getPlayableRanges(items), [items]);

  useEffect(() => {
    anchorRef.current = {
      time: videoTime || 0,
      playing: !!isPlaying,
      updatedAt: syncToken || Date.now(),
    };
    setPlaying(!!isPlaying);

    const player = playerRef.current;
    if (!player || !ranges.length) return;
    const expected = clampToRanges(getExpectedTime(videoTime || 0, !!isPlaying, syncToken), ranges);
    const current = player.getCurrentTime?.() || 0;
    if (Math.abs(current - expected) > 0.35) {
      player.seekTo?.(expected, 'seconds');
    }
  }, [videoTime, isPlaying, syncToken, src, ranges]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !ranges.length) return;

      const { time, playing: remotePlaying, updatedAt } = anchorRef.current;
      const expected = clampToRanges(getExpectedTime(time, remotePlaying, updatedAt), ranges);
      const current = player.getCurrentTime?.() || 0;
      if (Math.abs(current - expected) > 0.75) {
        player.seekTo?.(expected, 'seconds');
      }
      setPlaying(remotePlaying);
    }, 400);

    return () => window.clearInterval(interval);
  }, [ranges]);

  if (!src) {
    return <div className="flex h-full w-full items-center justify-center bg-black text-white/20">No video attached</div>;
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <div className="h-full w-full max-h-full max-w-full">
        <ReactPlayer
          ref={playerRef}
          url={src}
          playing={playing}
          muted={!isAudioUnlocked}
          controls={false}
          width="100%"
          height="100%"
          playsinline
          onReady={() => {
            if (!ranges.length) return;
            const expected = clampToRanges(getExpectedTime(videoTime || 0, !!isPlaying, syncToken), ranges);
            playerRef.current?.seekTo?.(expected, 'seconds');
          }}
          onProgress={({ playedSeconds }) => {
            if (!ranges.length) return;
            const activeIndex = getActiveRangeIndex(playedSeconds, ranges);
            const activeRange = activeIndex >= 0 ? ranges[activeIndex] : null;
            if (!playing || !activeRange) return;
            if (playedSeconds > activeRange.end + 0.12) {
              const nextRange = ranges[activeIndex + 1] || null;
              if (!nextRange) {
                setPlaying(false);
                playerRef.current?.seekTo?.(activeRange.end, 'seconds');
                return;
              }
              if (hasPauseBetween(items, activeRange, nextRange)) {
                setPlaying(false);
                playerRef.current?.seekTo?.(activeRange.end, 'seconds');
                return;
              }
              playerRef.current?.seekTo?.(nextRange.start, 'seconds');
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