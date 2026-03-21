export function timeToSeconds(timeStr) {
  const parts = String(timeStr || '0:00:00').split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function secondsToTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function createPauseBlock(id) {
  return {
    id: id || `pause-${Date.now()}`,
    item_type: 'pause',
    start: '00:00:00',
    end: '00:00:00',
    label: 'Pause',
  };
}

export function normalizeVideoClipItems(items = []) {
  const normalized = [];

  items.forEach((item, idx) => {
    if (item?.item_type === 'pause') {
      normalized.push({
        id: item.id || `pause-${idx}`,
        item_type: 'pause',
        start: item.start || '00:00:00',
        end: item.end || '00:00:00',
        label: item.label || 'Pause',
      });
      return;
    }

    normalized.push({
      id: item?.id || `segment-${idx}`,
      item_type: 'segment',
      start: item?.start || '00:00:00',
      end: item?.end || '00:00:00',
      label: item?.label || '',
    });

    if (item?.pause_after) {
      normalized.push(createPauseBlock(`legacy-pause-${idx}`));
    }
  });

  return normalized;
}

export function getNextPlayableItemIndex(items = [], currentIndex) {
  for (let idx = currentIndex + 1; idx < items.length; idx += 1) {
    if (items[idx]?.item_type !== 'pause') {
      return idx;
    }
  }
  return -1;
}