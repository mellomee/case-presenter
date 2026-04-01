import React, { useMemo, useRef, useState } from 'react';

const VIEWBOX_SIZE = 1000;
const DEFAULT_STROKE_WIDTH = 6;

function normalizePoint(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}

function clampRect(start, end, color) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    id: `highlight-${Date.now()}`,
    x,
    y,
    width,
    height,
    color,
    opacity: 0.32,
  };
}

function toViewBox(value) {
  return Math.round(value * VIEWBOX_SIZE);
}

function renderStroke(stroke) {
  return (
    <polyline
      key={stroke.id}
      fill="none"
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      points={stroke.points.map((point) => `${toViewBox(point.x)},${toViewBox(point.y)}`).join(' ')}
    />
  );
}

function renderHighlight(highlight) {
  return (
    <rect
      key={highlight.id}
      x={toViewBox(highlight.x)}
      y={toViewBox(highlight.y)}
      width={toViewBox(highlight.width)}
      height={toViewBox(highlight.height)}
      fill={highlight.color}
      opacity={highlight.opacity ?? 0.32}
      rx="10"
      ry="10"
    />
  );
}

export default function AttorneyCentralMarkupLayer({
  enabled,
  tool,
  strokes = [],
  highlights = [],
  onAddStroke,
  onAddHighlight,
}) {
  const stageRef = useRef(null);
  const [draftStroke, setDraftStroke] = useState(null);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const [highlightStart, setHighlightStart] = useState(null);

  const overlayClassName = useMemo(() => {
    if (!enabled) return 'pointer-events-none';
    return tool === 'pan' ? 'pointer-events-none' : 'pointer-events-auto';
  }, [enabled, tool]);

  const finishStroke = () => {
    if (draftStroke?.points?.length > 1) onAddStroke?.(draftStroke);
    setDraftStroke(null);
  };

  const finishHighlight = () => {
    if (draftHighlight && draftHighlight.width > 0.003 && draftHighlight.height > 0.003) onAddHighlight?.(draftHighlight);
    setDraftHighlight(null);
    setHighlightStart(null);
  };

  const handlePointerDown = (event) => {
    if (!enabled || tool === 'pan' || !stageRef.current) return;
    const point = normalizePoint(event, stageRef.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (tool === 'pen') {
      setDraftStroke({
        id: `stroke-${Date.now()}`,
        color: '#ef4444',
        width: DEFAULT_STROKE_WIDTH,
        points: [point],
      });
      return;
    }

    if (tool === 'highlight') {
      setHighlightStart(point);
      setDraftHighlight(clampRect(point, point, '#facc15'));
    }
  };

  const handlePointerMove = (event) => {
    if (!enabled || tool === 'pan' || !stageRef.current) return;
    const point = normalizePoint(event, stageRef.current);

    if (tool === 'pen' && draftStroke) {
      setDraftStroke((current) => ({ ...current, points: [...current.points, point] }));
      return;
    }

    if (tool === 'highlight' && highlightStart) {
      setDraftHighlight(clampRect(highlightStart, point, '#facc15'));
    }
  };

  return (
    <div ref={stageRef} className={`absolute inset-0 ${overlayClassName}`}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} preserveAspectRatio="none">
        {highlights.map(renderHighlight)}
        {draftHighlight ? renderHighlight(draftHighlight) : null}
        {strokes.map(renderStroke)}
        {draftStroke ? renderStroke(draftStroke) : null}
      </svg>

      <div
        className={`absolute inset-0 ${enabled && tool !== 'pan' ? 'cursor-crosshair' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={tool === 'pen' ? finishStroke : finishHighlight}
        onPointerLeave={tool === 'pen' ? finishStroke : finishHighlight}
      />
    </div>
  );
}