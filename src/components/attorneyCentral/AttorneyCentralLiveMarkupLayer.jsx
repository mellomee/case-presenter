import React, { useEffect, useMemo, useRef, useState } from 'react';

const PEN_COLOR = '#ef4444';
const HIGHLIGHT_COLOR = '#facc15';

function toPercent(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

export default function AttorneyCentralLiveMarkupLayer({
  enabled,
  interactive,
  mode,
  currentPage,
  markup,
  onChange,
}) {
  const svgRef = useRef(null);
  const [draftStroke, setDraftStroke] = useState(null);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const pageMarkup = useMemo(() => {
    if (!markup || markup.page !== currentPage) return { strokes: [], highlights: [] };
    return {
      strokes: Array.isArray(markup.strokes) ? markup.strokes : [],
      highlights: Array.isArray(markup.highlights) ? markup.highlights : [],
    };
  }, [markup, currentPage]);

  useEffect(() => {
    setDraftStroke(null);
    setDraftHighlight(null);
  }, [currentPage, mode]);

  const getPoint = (clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: toPercent(clientX - rect.left, rect.width),
      y: toPercent(clientY - rect.top, rect.height),
    };
  };

  const commit = (next) => {
    onChange?.({
      page: currentPage,
      strokes: next.strokes,
      highlights: next.highlights,
    });
  };

  const handlePointerDown = (event) => {
    if (!enabled || !interactive) return;
    if (mode === 'navigate') return;
    const point = getPoint(event.clientX, event.clientY);
    if (!point) return;

    if (mode === 'pen') {
      setDraftStroke({ points: [point], color: PEN_COLOR, width: 0.6 });
    }

    if (mode === 'highlight') {
      setDraftHighlight({ start: point, current: point });
    }
  };

  const handlePointerMove = (event) => {
    if (!enabled || !interactive) return;
    if (draftStroke) {
      const point = getPoint(event.clientX, event.clientY);
      if (!point) return;
      setDraftStroke((current) => ({ ...current, points: [...current.points, point] }));
    }

    if (draftHighlight) {
      const point = getPoint(event.clientX, event.clientY);
      if (!point) return;
      setDraftHighlight((current) => ({ ...current, current: point }));
    }
  };

  const handlePointerUp = () => {
    if (!enabled || !interactive) return;

    if (draftStroke && draftStroke.points.length > 1) {
      commit({
        strokes: [...pageMarkup.strokes, draftStroke],
        highlights: pageMarkup.highlights,
      });
    }

    if (draftHighlight) {
      const x = Math.min(draftHighlight.start.x, draftHighlight.current.x);
      const y = Math.min(draftHighlight.start.y, draftHighlight.current.y);
      const width = Math.abs(draftHighlight.current.x - draftHighlight.start.x);
      const height = Math.abs(draftHighlight.current.y - draftHighlight.start.y);
      if (width > 0.5 && height > 0.5) {
        commit({
          strokes: pageMarkup.strokes,
          highlights: [...pageMarkup.highlights, { x, y, width, height, color: HIGHLIGHT_COLOR, opacity: 0.35 }],
        });
      }
    }

    setDraftStroke(null);
    setDraftHighlight(null);
  };

  const draftRect = draftHighlight ? {
    x: Math.min(draftHighlight.start.x, draftHighlight.current.x),
    y: Math.min(draftHighlight.start.y, draftHighlight.current.y),
    width: Math.abs(draftHighlight.current.x - draftHighlight.start.x),
    height: Math.abs(draftHighlight.current.y - draftHighlight.start.y),
  } : null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: enabled && interactive && mode !== 'navigate' ? 'auto' : 'none', touchAction: mode === 'navigate' ? 'none' : 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {pageMarkup.highlights.map((item, index) => (
        <rect
          key={`highlight-${index}`}
          x={`${item.x}%`}
          y={`${item.y}%`}
          width={`${item.width}%`}
          height={`${item.height}%`}
          fill={item.color || HIGHLIGHT_COLOR}
          opacity={item.opacity ?? 0.35}
          rx="3"
        />
      ))}

      {draftRect ? (
        <rect
          x={`${draftRect.x}%`}
          y={`${draftRect.y}%`}
          width={`${draftRect.width}%`}
          height={`${draftRect.height}%`}
          fill={HIGHLIGHT_COLOR}
          opacity="0.35"
          rx="3"
        />
      ) : null}

      {pageMarkup.strokes.map((stroke, index) => (
        <polyline
          key={`stroke-${index}`}
          points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={stroke.color || PEN_COLOR}
          strokeWidth={stroke.width || 0.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {draftStroke ? (
        <polyline
          points={draftStroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={draftStroke.color}
          strokeWidth={draftStroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}