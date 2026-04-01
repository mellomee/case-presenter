export function buildMarkupOverlay(markups = [], activePageNumber) {
  return (markups || []).filter((item) => Number(item.page) === Number(activePageNumber));
}

export function createPenStroke(points = [], color = '#ef4444') {
  return {
    id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'stroke',
    color,
    width: 6,
    page: 1,
    points,
  };
}

export function createHighlightRect(start, end, color = '#facc15') {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    id: `highlight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'highlight',
    color,
    opacity: 0.32,
    page: 1,
    x,
    y,
    width,
    height,
  };
}