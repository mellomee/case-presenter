import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import {
  getItemAnchorTime,
  getNextPlayableIndex,
  isPauseItem,
  normalizeVideoClipItems,
  timeToSeconds,
} from '@/lib/videoClipPlaylist';

function formatTime(secs) {
  if (!secs || Number.isNaN(secs)) return '0:00';
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getMatchingSegmentIndex(items, seconds) {
  return items.findIndex((item) => !isPauseItem(item) && seconds >= timeToSeconds(item.start) && seconds <= timeToSeconds(item.end));
}

export default function AttorneyHubVideoController({ sourceUrl, clipSegments = [], onStateChange }) {
  const playerRef = useRef(null);
  const suppressEndCheckRef = useRef(false);
  const resumeTimeoutRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const items = useMemo(() => normalizeVideoClipItems(Array.isArray(clipSegments) ? clipSegments : []), [clipSegments]);
  const isClip = items.length > 0;
  const firstPlayableIndex = useMemo(() => items.findIndex((item) => !isPauseItem(item)), [items]);
  const clipStart = isClip ? getItemAnchorTime(items, firstPlayableIndex >= 0 ? firstPlayableIndex : 0) : 0;
  const clipEnd = useMemo(() => {
    if (!isClip) return null;
    const playableItems = items.filter((item) => !isPauseItem(item));
    if (!playableItems.length) return 0;
    return timeToSeconds(playableItems[playableItems.length - 1].end);
  }, [items, isClip]);

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const clampTime = useCallback((time) => {
    const rawTime = Math.max(0, time || 0);
    if (!isClip) {
      const max = duration || rawTime;
      return Math.min(rawTime, max);
    }
    if (clipEnd === null) return rawTime;
    return Math.max(clipStart, Math.min(rawTime, clipEnd));
  }, [clipEnd, clipStart, duration, isClip]);

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

    resumeTimeoutRef.current = setTimeout(() => {
      suppressEndCheckRef.current = false;
    }, 140);
  }, [items, clearResumeTimeout]);

  useEffect(() => () => clearResumeTimeout(), [clearResumeTimeout]);

  useEffect(() => {
    setPlaying(false);
    setCurrentSegmentIdx(firstPlayableIndex >= 0 ? firstPlayableIndex : 0);
    setCurrentTime(clipStart);
    setDuration(0);
    setReady(false);
    setSeeking(false);
    setHasInteracted(false);
    suppressEndCheckRef.current = false;
    clearResumeTimeout();
  }, [sourceUrl, clipStart, firstPlayableIndex, clearResumeTimeout]);

  useEffect(() => {
    if (!isClip || !items.length) return;
    const safeIndex = Math.min(Math.max(currentSegmentIdx, 0), items.length - 1);
    seekToItem(safeIndex, { resume: false });
  }, [items, isClip, seekToItem]);

  useEffect(() => {
    onStateChange?.({ currentTime, playing });
  }, [currentTime, playing, onStateChange]);

  const currentItem = items[currentSegmentIdx];

  const handlePlay = () => {
    setHasInteracted(true);

    if (isClip && isPauseItem(currentItem)) {
      const nextPlayableIndex = getNextPlayableIndex(items, currentSegmentIdx);
      if (nextPlayableIndex >= 0) {
        seekToItem(nextPlayableIndex, { resume: true });
      }
      return;
    }

    const nextTime = clampTime(playerRef.current?.getCurrentTime?.() || currentTime || clipStart);
    if (playerRef.current && Math.abs((playerRef.current.getCurrentTime?.() || 0) - nextTime) > 0.25) {
      playerRef.current.seekTo(nextTime, 'seconds');
    }
    setPlaying(true);
    setCurrentTime(nextTime);
  };

  const handlePause = () => {
    const nextTime = clampTime(playerRef.current?.getCurrentTime?.() || currentTime || 0);
    setPlaying(false);
    setCurrentTime(nextTime);
  };

  const handlePlayPause = () => {
    if (playing) {
      handlePause();
      return;
    }
    handlePlay();
  };

  const handleReady = () => {
    setReady(true);
    const anchorTime = isClip && items.length
      ? getItemAnchorTime(items, currentSegmentIdx)
      : clampTime(currentTime || clipStart);
    playerRef.current?.seekTo(anchorTime, 'seconds');
    setCurrentTime(anchorTime);
  };

  const handleProgress = ({ playedSeconds }) => {
    if (seeking) return;

    if (isClip) {
      const matchingIndex = getMatchingSegmentIndex(items, playedSeconds);
      if (matchingIndex >= 0 && matchingIndex !== currentSegmentIdx) {
        setCurrentSegmentIdx(matchingIndex);
      }

      if (!suppressEndCheckRef.current) {
        setCurrentTime(playedSeconds);
      }

      if (!currentItem || isPauseItem(currentItem) || suppressEndCheckRef.current) return;

      const endSec = timeToSeconds(currentItem.end);
      if (playedSeconds >= endSec - 0.05) {
        if (currentSegmentIdx < items.length - 1) {
          const nextItem = items[currentSegmentIdx + 1];
          seekToItem(currentSegmentIdx + 1, { resume: !isPauseItem(nextItem) });
        } else {
          setCurrentTime(endSec);
          setPlaying(false);
        }
      }
      return;
    }

    setCurrentTime(playedSeconds);
  };

  const handleSeekChange = (value) => {
    setSeeking(true);
    setCurrentTime(value[0]);
  };

  const handleSeekCommit = (value) => {
    const nextTime = clampTime(value[0]);
    playerRef.current?.seekTo(nextTime, 'seconds');
    setCurrentTime(nextTime);
    setSeeking(false);

    if (isClip) {
      const matchingIndex = getMatchingSegmentIndex(items, nextTime);
      if (matchingIndex >= 0) {
        setCurrentSegmentIdx(matchingIndex);
      }
    }
  };

  const handleSkip = (seconds) => {
    const nextTime = clampTime((playerRef.current?.getCurrentTime?.() || currentTime || 0) + seconds);
    playerRef.current?.seekTo(nextTime, 'seconds');
    setCurrentTime(nextTime);

    if (isClip) {
      const matchingIndex = getMatchingSegmentIndex(items, nextTime);
      if (matchingIndex >= 0) {
        setCurrentSegmentIdx(matchingIndex);
      }
    }
  };

  if (!sourceUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <p className="text-sm text-zinc-500">No video source available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-black overflow-hidden">
      <div className="relative min-h-0 flex-1">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        )}
        {!hasInteracted && ready && (
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
          >
            <Play className="h-20 w-20 fill-white text-white drop-shadow-lg" />
          </button>
        )}
        <ReactPlayer
          ref={playerRef}
          url={sourceUrl}
          playing={playing && hasInteracted}
          volume={muted ? 0 : volume}
          width="100%"
          height="100%"
          onReady={handleReady}
          onDuration={setDuration}
          onProgress={handleProgress}
          onEnded={() => {
            const endTime = clipEnd ?? duration;
            setPlaying(false);
            setCurrentTime(endTime || 0);
          }}
          progressInterval={250}
          playsinline
          style={{ position: 'absolute', top: 0, left: 0 }}
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

      <div className="shrink-0 space-y-2.5 border-t border-zinc-700 bg-zinc-900/95 px-4 py-3 backdrop-blur">
        <Slider
          value={[currentTime]}
          min={isClip ? clipStart : 0}
          max={isClip && clipEnd !== null ? clipEnd : duration || 100}
          step={0.25}
          onValueChange={handleSeekChange}
          onValueCommit={handleSeekCommit}
          className="w-full cursor-pointer"
        />

        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs tabular-nums text-zinc-400">
            {isClip
              ? `${formatTime(Math.max(currentTime - clipStart, 0))} / ${formatTime(Math.max((clipEnd ?? duration) - clipStart, 0))}`
              : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </span>

          <div className="flex flex-1 items-center justify-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white" onClick={() => handleSkip(-10)}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={handlePlayPause}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white" onClick={() => handleSkip(10)}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex w-28 shrink-0 items-center justify-end gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => setMuted((value) => !value)}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[muted ? 0 : volume]}
              max={1}
              step={0.05}
              onValueChange={(value) => {
                setVolume(value[0]);
                setMuted(value[0] === 0);
              }}
              className="w-16"
            />
          </div>
        </div>
      </div>
    </div>
  );
}