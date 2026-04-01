import React from 'react';

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

export default function AttorneyMarkupLayer({ mode, tool, strokes, highlights, draftStroke, draftHighlight, setDraftStroke, setDraftHighlight, setHighlightStart, highlightStart, onAddStroke, onAddHighlight }) {
  const disabled = mode !== 'markup';

  const handlePointerDown = (event) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    const point = normalizePoint(event, element);
    element.setPointerCapture?.(event.pointerId);

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
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    const point = normalizePoint(event, element);

    if (tool === 'pen' && draftStroke) {
      setDraftStroke((current) => ({ ...current, points: [...current.points, point] }));
      return;
    }

    if (tool === 'highlight' && highlightStart) {
      setDraftHighlight(clampRect(highlightStart, point, '#facc15'));
    }
  };

  const finishStroke = () => {
    if (draftStroke?.points?.length > 1) onAddStroke?.(draftStroke);
    setDraftStroke(null);
  };

  const finishHighlight = () => {
    if (draftHighlight && draftHighlight.width > 0.003 && draftHighlight.height > 0.003) onAddHighlight?.(draftHighlight);
    setDraftHighlight(null);
    setHighlightStart(null);
  };

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} preserveAspectRatio="none">
        {highlights.map(renderHighlight)}
        {draftHighlight ? renderHighlight(draftHighlight) : null}
        {strokes.map(renderStroke)}
        {draftStroke ? renderStroke(draftStroke) : null}
      </svg>
      <div
        className={`absolute inset-0 z-30 ${disabled ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair touch-none'}`}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (tool === 'pen') finishStroke(); else finishHighlight();
        }}
        onPointerLeave={() => {
          if (tool === 'pen') finishStroke(); else finishHighlight();
        }}
      />
    </>
  );
}