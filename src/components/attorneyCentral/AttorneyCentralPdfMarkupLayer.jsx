import React, { useMemo, useRef, useState } from 'react';

const VIEWBOX_SIZE = 1000;
const DEFAULT_STROKE_WIDTH = 5;
const PEN_COLOR = '#ef4444';
const HIGHLIGHT_COLOR = '#facc15';

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

export default function AttorneyCentralPdfMarkupLayer({ mode, markup, onChange }) {
  const stageRef = useRef(null);
  const [draftStroke, setDraftStroke] = useState(null);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const [highlightStart, setHighlightStart] = useState(null);

  const strokes = markup?.strokes || [];
  const highlights = markup?.highlights || [];
  const interactive = mode === 'pen' || mode === 'highlight';

  const cursorClass = useMemo(() => {
    if (mode === 'pen') return 'cursor-crosshair';
    if (mode === 'highlight') return 'cursor-crosshair';
    return 'cursor-default';
  }, [mode]);

  const finishStroke = () => {
    if (draftStroke?.points?.length > 1) {
      onChange({
        strokes: [...strokes, draftStroke],
        highlights,
      });
    }
    setDraftStroke(null);
  };

  const finishHighlight = () => {
    if (draftHighlight && draftHighlight.width > 0.003 && draftHighlight.height > 0.003) {
      onChange({
        strokes,
        highlights: [...highlights, draftHighlight],
      });
    }
    setDraftHighlight(null);
    setHighlightStart(null);
  };

  const handlePointerDown = (event) => {
    if (!interactive || !stageRef.current) return;
    const point = normalizePoint(event, stageRef.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (mode === 'pen') {
      setDraftStroke({
        id: `stroke-${Date.now()}`,
        color: PEN_COLOR,
        width: DEFAULT_STROKE_WIDTH,
        points: [point],
      });
      return;
    }

    if (mode === 'highlight') {
      setHighlightStart(point);
      setDraftHighlight(clampRect(point, point, HIGHLIGHT_COLOR));
    }
  };

  const handlePointerMove = (event) => {
    if (!interactive || !stageRef.current) return;
    const point = normalizePoint(event, stageRef.current);

    if (mode === 'pen' && draftStroke) {
      setDraftStroke((current) => ({
        ...current,
        points: [...current.points, point],
      }));
      return;
    }

    if (mode === 'highlight' && highlightStart) {
      setDraftHighlight(clampRect(highlightStart, point, HIGHLIGHT_COLOR));
    }
  };

  return (
    <div className={`absolute inset-0 z-20 ${interactive ? 'pointer-events-auto' : 'pointer-events-none'} ${cursorClass}`}>
      <div ref={stageRef} className="absolute inset-0">
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} preserveAspectRatio="none">
          {highlights.map(renderHighlight)}
          {draftHighlight ? renderHighlight(draftHighlight) : null}
          {strokes.map(renderStroke)}
          {draftStroke ? renderStroke(draftStroke) : null}
        </svg>
        <div
          className="absolute inset-0"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={mode === 'pen' ? finishStroke : finishHighlight}
          onPointerLeave={mode === 'pen' ? finishStroke : finishHighlight}
        />
      </div>
    </div>
  );
}