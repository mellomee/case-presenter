// Parse page range string "1-3, 5, 13-18" into array [1,2,3,5,13,14,15,16,17,18]
export function parsePageRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') return [];
  
  const pages = new Set();
  const parts = rangeStr.split(',').map((s) => s.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((s) => parseInt(s.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) pages.add(i);
      }
    } else {
      const p = parseInt(part);
      if (!isNaN(p)) pages.add(p);
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
}

// Compress page array [1,2,3,5,13,14,15,16,17,18] into "1-3, 5, 13-18"
export function compressPageRange(pages) {
  if (!pages || pages.length === 0) return '';
  
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let start = sorted[0];
  let end = sorted[0];
  
  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === end + 1) {
      end = current;
    } else {
      if (start === end) {
        result.push(start);
      } else {
        result.push(`${start}-${end}`);
      }
      start = current;
      end = current;
    }
  }
  
  return result.join(', ');
}