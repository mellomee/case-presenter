import React, { useMemo } from 'react';

function timeToSeconds(timeStr) {
  const parts = String(timeStr || '0:00:00').split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

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
  const ranges = useMemo(
    () => segments.map((segment) => {
      const start = timeToSeconds(segment.start);
      const end = timeToSeconds(segment.end);
      return {
        ...segment,
        start,
        end,
        duration: Math.max(0, end - start),
      };
    }),
    [segments]
  );

  const playlistTotal = ranges.reduce((sum, range) => sum + range.duration, 0);
  const activeRange = ranges[currentSegmentIdx] || ranges[0];
  const elapsedBeforeActive = ranges.slice(0, currentSegmentIdx).reduce((sum, range) => sum + range.duration, 0);
  const elapsedInsideActive = activeRange
    ? Math.min(Math.max(currentTime - activeRange.start, 0), activeRange.duration)
    : 0;
  const playlistElapsed = elapsedBeforeActive + elapsedInsideActive;
  const playlistPercent = playlistTotal > 0 ? (playlistElapsed / playlistTotal) * 100 : 0;
  const originalPercent = videoDuration > 0 ? Math.min((currentTime / videoDuration) * 100, 100) : 0;
  const currentSegmentStartPercent = videoDuration > 0 && activeRange ? (activeRange.start / videoDuration) * 100 : 0;
  const currentSegmentWidthPercent = videoDuration > 0 && activeRange ? ((activeRange.end - activeRange.start) / videoDuration) * 100 : 0;

  if (!ranges.length) return null;

  let cumulativePercent = 0;
  const segmentStops = ranges.map((range) => {
    cumulativePercent += playlistTotal > 0 ? (range.duration / playlistTotal) * 100 : 0;
    return cumulativePercent;
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 px-3 py-3 shadow-sm">
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">Playlist progress</span>
            <span>{formatTime(playlistElapsed)} / {formatTime(playlistTotal)}</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: `${playlistPercent}%` }} />
            {segmentStops.slice(0, -1).map((stop, index) => (
              <div
                key={index}
                className="absolute inset-y-0 w-px bg-slate-950/80"
                style={{ left: `${stop}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-slate-500">
            <span>Segment {currentSegmentIdx + 1} of {ranges.length}</span>
            {activeRange && <span>{formatTime(activeRange.duration)} clip length</span>}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">Original video position</span>
            <span>{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-slate-800">
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
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-slate-500">
              <span>Current clip window</span>
              <span>{formatTime(activeRange.start)} → {formatTime(activeRange.end)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}