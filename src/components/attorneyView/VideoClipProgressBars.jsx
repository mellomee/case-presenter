import React, { useMemo } from 'react';
import { getPlayableRanges, isPauseItem, normalizeVideoClipItems } from '@/lib/videoClipPlaylist';

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function VideoClipProgressBars({ segments = [], currentSegmentIdx = 0, currentTime = 0, videoDuration = 0 }) {
  const items = useMemo(() => normalizeVideoClipItems(segments), [segments]);
  const ranges = useMemo(() => getPlayableRanges(items), [items]);

  const playlistTotal = ranges.reduce((sum, range) => sum + range.duration, 0);
  const currentItem = items[currentSegmentIdx] || items[0] || null;
  const activeRange = ranges.find((range) => currentTime >= range.start - 0.25 && currentTime <= range.end + 0.25) || null;
  const elapsedBeforeCurrentItem = ranges
    .filter((range) => range.originalIndex < currentSegmentIdx)
    .reduce((sum, range) => sum + range.duration, 0);
  const elapsedInsideActive = currentItem && !isPauseItem(currentItem) && activeRange
    ? Math.min(Math.max(currentTime - activeRange.start, 0), activeRange.duration)
    : 0;
  const playlistElapsed = elapsedBeforeCurrentItem + elapsedInsideActive;
  const playlistPercent = playlistTotal > 0 ? (playlistElapsed / playlistTotal) * 100 : 0;
  const originalPercent = videoDuration > 0 ? Math.min((currentTime / videoDuration) * 100, 100) : 0;
  const currentSegmentStartPercent = videoDuration > 0 && activeRange ? (activeRange.start / videoDuration) * 100 : 0;
  const currentSegmentWidthPercent = videoDuration > 0 && activeRange ? ((activeRange.end - activeRange.start) / videoDuration) * 100 : 0;

  if (!items.length || !ranges.length) return null;

  let cumulativePercent = 0;
  const segmentStops = ranges.map((range) => {
    cumulativePercent += playlistTotal > 0 ? (range.duration / playlistTotal) * 100 : 0;
    return cumulativePercent;
  });

  let cumulativeDuration = 0;
  const pauseMarkers = items.reduce((markers, item) => {
    if (isPauseItem(item)) {
      markers.push(playlistTotal > 0 ? (cumulativeDuration / playlistTotal) * 100 : 0);
      return markers;
    }

    const matchingRange = ranges.find((range) => range.originalIndex === items.indexOf(item));
    if (matchingRange) {
      cumulativeDuration += matchingRange.duration;
    }
    return markers;
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 px-2.5 py-2 shadow-sm">
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
            <span className="min-w-0 font-medium text-slate-300">Playlist progress</span>
            <span className="shrink-0">{formatTime(playlistElapsed)} / {formatTime(playlistTotal)}</span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: `${playlistPercent}%` }} />
            {segmentStops.slice(0, -1).map((stop, index) => (
              <div
                key={`segment-stop-${index}`}
                className="absolute inset-y-0 w-px bg-slate-950/80"
                style={{ left: `${stop}%` }}
              />
            ))}
            {pauseMarkers.map((stop, index) => (
              <div
                key={`pause-stop-${index}`}
                className="absolute inset-y-0 w-0.5 bg-amber-400"
                style={{ left: `${stop}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-slate-500">
            <span>{isPauseItem(currentItem) ? `Pause ${currentSegmentIdx + 1}` : `Segment ${currentSegmentIdx + 1}`} of {items.length}</span>
            {activeRange && <span>{formatTime(activeRange.duration)} clip length</span>}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
            <span className="min-w-0 font-medium text-slate-300">Original video position</span>
            <span className="shrink-0">{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
            {activeRange && (
              <div
                className="absolute inset-y-0 border-x border-amber-300/70 bg-amber-400/20"
                style={{
                  left: `${currentSegmentStartPercent}%`,
                  width: `${currentSegmentWidthPercent}%`,
                }}
              />
            )}
            <div className="absolute inset-y-0 left-0 bg-slate-300/90" style={{ width: `${originalPercent}%` }} />
          </div>
          {activeRange && (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-slate-500">
              <span>Current clip window</span>
              <span className="shrink-0">{formatTime(activeRange.start)} → {formatTime(activeRange.end)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}