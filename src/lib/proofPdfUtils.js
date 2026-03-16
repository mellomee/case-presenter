export function sortUniquePages(pages = []) {
  return [...new Set((pages || [])
    .map((page) => Number(page))
    .filter((page) => Number.isInteger(page) && page > 0))].sort((a, b) => a - b);
}

export function formatPageSelection(pages = []) {
  const sorted = sortUniquePages(pages);
  if (!sorted.length) return '';

  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const page = sorted[i];
    if (page === end + 1) {
      end = page;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = page;
      end = page;
    }
  }

  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

export function parsePageSelection(value = '') {
  if (!value) return [];

  const pages = [];
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (part.includes('-')) {
        const [startRaw, endRaw] = part.split('-');
        const start = Number(startRaw);
        const end = Number(endRaw);
        if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
          for (let page = start; page <= end; page += 1) {
            pages.push(page);
          }
        }
      } else {
        const page = Number(part);
        if (Number.isInteger(page) && page > 0) {
          pages.push(page);
        }
      }
    });

  return sortUniquePages(pages);
}

export function getHighlightsForPage(highlights = [], page, fallbackPage = 1) {
  return (Array.isArray(highlights) ? highlights : []).filter((highlight) => {
    const highlightPage = Number.isInteger(highlight?.page) ? highlight.page : fallbackPage;
    return highlightPage === page;
  });
}

export function getHighlightPages(highlights = [], fallbackPage = 1) {
  return sortUniquePages((Array.isArray(highlights) ? highlights : []).map((highlight) => (
    Number.isInteger(highlight?.page) ? highlight.page : fallbackPage
  )));
}

export function getPrimaryHighlightPage(highlights = [], fallbackPage = 1) {
  return getHighlightPages(highlights, fallbackPage)[0] || fallbackPage || 1;
}

export function getHighlightBounds(highlights = [], page, fallbackPage = 1) {
  const pageHighlights = getHighlightsForPage(highlights, page, fallbackPage);
  if (!pageHighlights.length) return null;

  const minX = Math.min(...pageHighlights.map((highlight) => highlight.x));
  const minY = Math.min(...pageHighlights.map((highlight) => highlight.y));
  const maxX = Math.max(...pageHighlights.map((highlight) => highlight.x + highlight.width));
  const maxY = Math.max(...pageHighlights.map((highlight) => highlight.y + highlight.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: minX + ((maxX - minX) / 2),
    centerY: minY + ((maxY - minY) / 2),
  };
}