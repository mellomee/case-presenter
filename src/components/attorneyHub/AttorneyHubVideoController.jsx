import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { getPlayableRanges, normalizeVideoClipItems } from '@/lib/videoClipPlaylist';

function formatTime(secs) {
  if (!secs || Number.isNaN(secs)) return '0:00';
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getRangeIndex(time, ranges) {
  return ranges.findIndex((range) => time >= range.start - 0.1 && time <= range.end + 0.1);
}

function hasPauseBetween(items, currentRange, nextRange) {
  if (!currentRange || !nextRange) return false;
  return items.slice(currentRange.originalIndex + 1, nextRange.originalIndex).some((item) => item.type === 'pause');
}

export default function AttorneyHubVideoController({ sourceUrl, clipSegments = [], onStateChange }) {
  const playerRef = useRef(null);
  const lastSyncAtRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const items = useMemo(() => normalizeVideoClipItems(Array.isArray(clipSegments) ? clipSegments : []), [clipSegments]);
  const ranges = useMemo(() => getPlayableRanges(items), [items]);
  const isClip = ranges.length > 0;
  const clipStart = isClip ? ranges[0].start : 0;
  const clipEnd = isClip ? ranges[ranges.length - 1].end : null;

  const pushSync = useCallback((overrides = {}) => {
    onStateChange?.({ currentTime, playing, ...overrides });
  }, [currentTime, onStateChange, playing]);

  const clampTime = useCallback((time) => {
    if (!isClip) {
      const max = duration || time || 0;
      return Math.max(0, Math.min(time, max));
    }
    return Math.max(clipStart, Math.min(time, clipEnd ?? time));
  }, [clipEnd, clipStart, duration, isClip]);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(clipStart);
    setReady(false);
    setSeeking(false);
    setHasInteracted(false);
    lastSyncAtRef.current = 0;
  }, [sourceUrl, clipStart]);

  const handlePlay = () => {
    const nextTime = clampTime(currentTime || clipStart);
    if (playerRef.current && Math.abs((playerRef.current.getCurrentTime?.() || 0) - nextTime) > 0.25) {
      playerRef.current.seekTo(nextTime, 'seconds');
    }
    setHasInteracted(true);
    setPlaying(true);
    setCurrentTime(nextTime);
    lastSyncAtRef.current = 0;
    onStateChange?.({ currentTime: nextTime, playing: true });
  };

  const handlePause = () => {
    const nextTime = clampTime(playerRef.current?.getCurrentTime?.() || currentTime || 0);
    setPlaying(false);
    setCurrentTime(nextTime);
    onStateChange?.({ currentTime: nextTime, playing: false });
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
    if (clipStart > 0) {
      playerRef.current?.seekTo(clipStart, 'seconds');
    }
  };

  const handleProgress = ({ playedSeconds }) => {
    if (seeking) return;

    if (isClip) {
      const activeRangeIndex = getRangeIndex(playedSeconds, ranges);
      const activeRange = activeRangeIndex >= 0 ? ranges[activeRangeIndex] : null;

      if (activeRange && playedSeconds >= activeRange.end - 0.05) {
        const nextRange = ranges[activeRangeIndex + 1] || null;

        if (!nextRange) {
          setPlaying(false);
          setCurrentTime(activeRange.end);
          playerRef.current?.seekTo(activeRange.end, 'seconds');
          onStateChange?.({ currentTime: activeRange.end, playing: false });
          return;
        }

        const nextTime = nextRange.start;
        playerRef.current?.seekTo(nextTime, 'seconds');
        setCurrentTime(nextTime);

        if (hasPauseBetween(items, activeRange, nextRange)) {
          setPlaying(false);
          onStateChange?.({ currentTime: nextTime, playing: false });
        } else {
          const now = Date.now();
          if (now - lastSyncAtRef.current > 1200) {
            lastSyncAtRef.current = now;
            onStateChange?.({ currentTime: nextTime, playing: true });
          }
        }
        return;
      }
    }

    setCurrentTime(playedSeconds);

    if (playing) {
      const now = Date.now();
      if (now - lastSyncAtRef.current > 1200) {
        lastSyncAtRef.current = now;
        onStateChange?.({ currentTime: playedSeconds, playing: true });
      }
    }
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
    onStateChange?.({ currentTime: nextTime, playing });
  };

  const handleSkip = (seconds) => {
    const nextTime = clampTime((playerRef.current?.getCurrentTime?.() || currentTime || 0) + seconds);
    playerRef.current?.seekTo(nextTime, 'seconds');
    setCurrentTime(nextTime);
    onStateChange?.({ currentTime: nextTime, playing });
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
          progressInterval={350}
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