import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Loader2 } from 'lucide-react';

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoViewer({
  proof,
  mode = 'controller',
  syncState,
  onStateChange,
  allProofs = [],
  forceAudioOff = false,
}) {
  const isClip = proof?.proof_child_type === 'VideoClip';
  const clipSegments = isClip && proof?.video_clips ? JSON.parse(typeof proof.video_clips === 'string' ? proof.video_clips : JSON.stringify(proof.video_clips)) : [];
  const clipStart = clipSegments.length > 0 ? clipSegments[0].start ?? 0 : 0;
  const clipEnd = clipSegments.length > 0 ? clipSegments[clipSegments.length - 1].end ?? null : null;

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(clipStart);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const playerRef = useRef();

  const parentProof = isClip && proof?.parent_proof_id ? allProofs.find((p) => p.id === proof.parent_proof_id) : null;
  const videoUrl = proof?.video_url || proof?.file_url || parentProof?.video_url || parentProof?.file_url;

  const emitState = useCallback((overrides = {}) => {
    onStateChange && onStateChange({
      playing,
      currentTime,
      ...overrides,
    });
  }, [onStateChange, playing, currentTime]);

  useEffect(() => {
    if (mode !== 'viewer' || !syncState || !ready) return;
    const serverTime = syncState.currentTime || 0;
    const localTime = playerRef.current?.getCurrentTime() || 0;
    if (Math.abs(serverTime - localTime) > 2) {
      playerRef.current?.seekTo(serverTime, 'seconds');
    }
    if (syncState.playing !== undefined && syncState.playing !== playing) {
      setPlaying(syncState.playing);
    }
    if (syncState.volume !== undefined) {
      setVolume(syncState.volume);
      setMuted(syncState.volume === 0);
    }
  }, [syncState, mode, ready]);


  const handlePlayPause = () => {
    setHasInteracted(true);
    const next = !playing;
    setPlaying(next);
    emitState({ playing: next, currentTime });
  };

  const handlePlayClick = () => {
    setHasInteracted(true);
    setPlaying(true);
    emitState({ playing: true, currentTime });
  };

  const handleReady = () => {
    setReady(true);
    if (isClip && clipStart > 0) {
      playerRef.current?.seekTo(clipStart, 'seconds');
    }
  };

  const handleProgress = ({ playedSeconds }) => {
    if (!seeking) {
      if (isClip && clipEnd !== null && playedSeconds >= clipEnd) {
        setPlaying(false);
        playerRef.current?.seekTo(clipStart, 'seconds');
        setCurrentTime(clipStart);
        pushImmediate({ playing: false, currentTime: clipStart, volume });
        return;
      }
      setCurrentTime(playedSeconds);
      if (mode === 'controller' && playing) {
        debouncedPush({ playing, currentTime: playedSeconds, volume });
      }
    }
  };

  const handleSeekChange = (value) => {
    setSeeking(true);
    setCurrentTime(value[0]);
  };

  const handleSeekCommit = (value) => {
    const t = value[0];
    playerRef.current?.seekTo(t, 'seconds');
    setCurrentTime(t);
    setSeeking(false);
    pushImmediate({ playing, currentTime: t, volume });
  };

  const handleSkip = (secs) => {
    const t = Math.max(0, Math.min(currentTime + secs, duration));
    playerRef.current?.seekTo(t, 'seconds');
    setCurrentTime(t);
    pushImmediate({ playing, currentTime: t, volume });
  };

  const handleVolumeChange = (value) => {
    const v = value[0];
    setVolume(v);
    setMuted(v === 0);
    pushState({ volume: v });
  };

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <p className="text-zinc-500 text-sm">No video source available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <div className="flex-1 relative min-h-0">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        )}
        {mode === 'controller' && !hasInteracted && ready && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 cursor-pointer" onClick={handlePlayClick}>
            <Play className="w-20 h-20 text-white drop-shadow-lg" fill="white" />
          </div>
        )}
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={mode === 'viewer' ? playing : playing && hasInteracted}
          volume={forceAudioOff || muted ? 0 : volume}
          width="100%"
          height="100%"
          onDuration={setDuration}
          onProgress={handleProgress}
          onReady={handleReady}
          progressInterval={500}
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

      {mode === 'controller' && (
        <div className="shrink-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-700 px-4 py-3 space-y-2.5">
          {isClip && duration > 0 && (
            <div className="w-full">
              <div className="relative h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-amber-500/60 rounded-full"
                  style={{
                    left: `${(clipStart / duration) * 100}%`,
                    width: `${((clipEnd ?? duration) - clipStart) / duration * 100}%`,
                  }}
                />
                <div className="absolute h-full w-0.5 bg-amber-400" style={{ left: `${(currentTime / duration) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-0.5 text-[10px] text-zinc-500 tabular-nums">
                <span>0:00</span>
                <span className="text-amber-500/80">
                  {formatTime(clipStart)} – {formatTime(clipEnd ?? duration)}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          <Slider
            value={[currentTime]}
            min={isClip ? clipStart : 0}
            max={isClip && clipEnd !== null ? clipEnd : duration || 100}
            step={0.5}
            onValueChange={handleSeekChange}
            onValueCommit={handleSeekCommit}
            className="w-full cursor-pointer"
          />

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 tabular-nums w-28 shrink-0">
              {isClip ? `${formatTime(currentTime - clipStart)} / ${formatTime((clipEnd ?? duration) - clipStart)}` : `${formatTime(currentTime)} / ${formatTime(duration)}`}
            </span>

            <div className="flex items-center gap-1 flex-1 justify-center">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white" onClick={() => handleSkip(-10)}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11 text-white bg-white/10 hover:bg-white/20 rounded-full" onClick={handlePlayPause}>
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white" onClick={() => handleSkip(10)}>
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 w-28 justify-end shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
                onClick={() => setMuted((m) => !m)}
              >
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider value={[muted ? 0 : volume]} max={1} step={0.05} onValueChange={handleVolumeChange} className="w-16" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}