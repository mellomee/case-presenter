import React, { useEffect, useRef, useState } from 'react';

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

export default function AttorneyCentralLiveMarkupOverlay({
  mode = 'navigate',
  strokes = [],
  highlights = [],
  penColor = '#ef4444',
  highlightColor = '#facc15',
  onChange,
}) {
  const stageRef = useRef(null);
  const draftStrokeRef = useRef(null);
  const draftHighlightRef = useRef(null);
  const highlightStartRef = useRef(null);
  const strokesRef = useRef(strokes);
  const highlightsRef = useRef(highlights);
  const [draftStroke, setDraftStroke] = useState(null);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const [highlightStart, setHighlightStart] = useState(null);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  useEffect(() => {
    draftStrokeRef.current = draftStroke;
  }, [draftStroke]);

  useEffect(() => {
    draftHighlightRef.current = draftHighlight;
  }, [draftHighlight]);

  useEffect(() => {
    highlightStartRef.current = highlightStart;
  }, [highlightStart]);

  const finishStroke = () => {
    const nextStroke = draftStrokeRef.current;
    if (nextStroke?.points?.length > 1) {
      onChange?.({ strokes: [...strokesRef.current, nextStroke], highlights: highlightsRef.current });
    }
    draftStrokeRef.current = null;
    setDraftStroke(null);
  };

  const finishHighlight = () => {
    const nextHighlight = draftHighlightRef.current;
    if (nextHighlight && nextHighlight.width > 0.003 && nextHighlight.height > 0.003) {
      onChange?.({ strokes: strokesRef.current, highlights: [...highlightsRef.current, nextHighlight] });
    }
    draftHighlightRef.current = null;
    highlightStartRef.current = null;
    setDraftHighlight(null);
    setHighlightStart(null);
  };

  const handlePointerDown = (event) => {
    if (mode === 'navigate' || !stageRef.current) return;
    const point = normalizePoint(event, stageRef.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (mode === 'pen') {
      const nextStroke = {
        id: `stroke-${Date.now()}`,
        color: penColor,
        width: DEFAULT_STROKE_WIDTH,
        points: [point],
      };
      draftStrokeRef.current = nextStroke;
      setDraftStroke(nextStroke);
      return;
    }

    if (mode === 'highlight') {
      highlightStartRef.current = point;
      setHighlightStart(point);
      const nextHighlight = clampRect(point, point, highlightColor);
      draftHighlightRef.current = nextHighlight;
      setDraftHighlight(nextHighlight);
    }
  };

  const handlePointerMove = (event) => {
    if (mode === 'navigate' || !stageRef.current) return;
    const point = normalizePoint(event, stageRef.current);

    if (mode === 'pen' && draftStrokeRef.current) {
      const nextStroke = { ...draftStrokeRef.current, points: [...draftStrokeRef.current.points, point] };
      draftStrokeRef.current = nextStroke;
      setDraftStroke(nextStroke);
      return;
    }

    if (mode === 'highlight' && highlightStartRef.current) {
      const nextHighlight = clampRect(highlightStartRef.current, point, highlightColor);
      draftHighlightRef.current = nextHighlight;
      setDraftHighlight(nextHighlight);
    }
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
        ref={stageRef}
        className={`absolute inset-0 z-30 ${mode === 'navigate' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair touch-none'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={mode === 'pen' ? finishStroke : finishHighlight}
        onPointerLeave={mode === 'pen' ? finishStroke : finishHighlight}
      />
    </>
  );
}