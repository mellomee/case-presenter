import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Volume2 } from 'lucide-react';

function getExpectedTime(baseTime, isPlaying, updatedAt) {
  const startTime = new Date(updatedAt || Date.now()).getTime();
  const elapsed = isPlaying ? Math.max(0, (Date.now() - startTime) / 1000) : 0;
  return Math.max(0, (baseTime || 0) + elapsed);
}

export default function JurySyncedVideoPlayer({ src, videoTime = 0, isPlaying = false, syncToken }) {
  const playerRef = useRef(null);
  const anchorRef = useRef({ time: videoTime, playing: isPlaying, updatedAt: syncToken || Date.now() });
  const [playing, setPlaying] = useState(!!isPlaying);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  useEffect(() => {
    anchorRef.current = {
      time: videoTime || 0,
      playing: !!isPlaying,
      updatedAt: syncToken || Date.now(),
    };
    setPlaying(!!isPlaying);

    const player = playerRef.current;
    if (!player) return;
    const expected = getExpectedTime(videoTime || 0, !!isPlaying, syncToken);
    const current = player.getCurrentTime?.() || 0;
    if (Math.abs(current - expected) > 0.35) {
      player.seekTo?.(expected, 'seconds');
    }
  }, [videoTime, isPlaying, syncToken, src]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const { time, playing: remotePlaying, updatedAt } = anchorRef.current;
      const expected = getExpectedTime(time, remotePlaying, updatedAt);
      const current = player.getCurrentTime?.() || 0;
      if (Math.abs(current - expected) > 0.75) {
        player.seekTo?.(expected, 'seconds');
      }
      setPlaying(remotePlaying);
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

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