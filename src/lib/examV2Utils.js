export function parseIdsField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.ids)) return value.ids.filter(Boolean);
    return Object.values(value).filter((item) => typeof item === 'string' && item);
  }
  return [];
}

export function getProofDisplayName(proof) {
  return proof?.formal_name || proof?.name || 'Untitled proof';
}

export function getJointLabel(proof) {
  return proof?.joint_exhibit_num || '—';
}

export function getProofTypeLabel(proof) {
  if (!proof) return 'Group';
  if (proof.proof_child_type) return proof.proof_child_type;
  return proof.file_type || proof.proof_category || 'Proof';
}

export function getProofSide(proof) {
  return proof?.admitted_by || proof?.joint_by || 'Neutral';
}

export function sortByJointExhibit(items = []) {
  return [...items].sort((a, b) => getJointLabel(a).localeCompare(getJointLabel(b), undefined, { numeric: true, sensitivity: 'base' }));
}

export function truncateGroupLabel(label, max = 24) {
  return String(label || '').trim().slice(0, max);
}

export function buildItemTree(items = [], parentId = null) {
  return items
    .filter((item) => (item.parent_item_id || null) === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item) => ({
      ...item,
      children: buildItemTree(items, item.id),
    }));
}

export function collectDescendantIds(items = [], parentId) {
  const children = items.filter((item) => item.parent_item_id === parentId);
  return children.flatMap((child) => [child.id, ...collectDescendantIds(items, child.id)]);
}