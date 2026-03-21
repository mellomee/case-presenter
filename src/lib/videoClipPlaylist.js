export function timeToSeconds(timeStr) {
  const parts = String(timeStr || '0:00:00').split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function normalizeVideoClipItems(items = []) {
  return items.map((item, index) => {
    const type = item?.type === 'pause' ? 'pause' : 'segment';
    return {
      id: item?.id || `video-clip-item-${index}`,
      type,
      label: item?.label || '',
      start: type === 'segment' ? String(item?.start || '00:00:00') : '',
      end: type === 'segment' ? String(item?.end || '00:00:00') : '',
    };
  });
}

export function isPauseItem(item) {
  return item?.type === 'pause';
}

export function isSegmentItem(item) {
  return !isPauseItem(item);
}

export function getFirstPlayableIndex(items = []) {
  return items.findIndex((item) => isSegmentItem(item));
}

export function getNextPlayableIndex(items = [], currentIndex = -1) {
  for (let index = currentIndex + 1; index < items.length; index += 1) {
    if (isSegmentItem(items[index])) return index;
  }
  return -1;
}

export function getItemAnchorTime(items = [], currentIndex = 0) {
  const currentItem = items[currentIndex];
  if (!currentItem) return 0;
  if (isSegmentItem(currentItem)) return timeToSeconds(currentItem.start);

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (isSegmentItem(items[index])) return timeToSeconds(items[index].end);
  }

  for (let index = currentIndex + 1; index < items.length; index += 1) {
    if (isSegmentItem(items[index])) return timeToSeconds(items[index].start);
  }

  return 0;
}

export function getPlayableRanges(items = []) {
  return items
    .map((item, index) => {
      if (isPauseItem(item)) return null;
      const start = timeToSeconds(item.start);
      const end = timeToSeconds(item.end);
      return {
        ...item,
        originalIndex: index,
        start,
        end,
        duration: Math.max(0, end - start),
      };
    })
    .filter(Boolean);
}