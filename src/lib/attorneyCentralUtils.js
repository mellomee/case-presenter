export function parseIdsField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return parseIdsField(parsed);
    } catch {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => parseIdsField(item)).filter(Boolean);
  }

  return [];
}

export function getProofDisplayLabel(proof) {
  return proof?.formal_name || proof?.name || 'Untitled Proof';
}

export function getProofTypeLabel(proof) {
  if (!proof) return 'Proof';
  if (proof.proof_child_type === 'Extract') return 'Extract';
  if (proof.proof_child_type === 'ExtractClip') return 'Extract Clip';
  if (proof.proof_child_type === 'VideoClip') return 'Video Clip';
  if (proof.proof_category === 'Deposition') return 'Deposition';
  if (proof.file_type === 'Video') return 'Video Exhibit';
  if (proof.file_type === 'Image') return 'Image Exhibit';
  return 'Exhibit';
}

export function getProofTypeTone(proof) {
  const label = getProofTypeLabel(proof);
  if (label === 'Extract') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (label === 'Extract Clip') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (label === 'Video Clip') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (label === 'Deposition') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export function getProofStatusTone(proof) {
  if (proof?.proof_category === 'Deposition') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (proof?.status === 'Joint') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (proof?.status === 'Admitted') return 'border-green-200 bg-green-50 text-green-700';
  if (proof?.status === 'Demonstrative') return 'border-purple-200 bg-purple-50 text-purple-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

export function getExhibitLabel(proof) {
  if (!proof) return '—';
  return proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || (proof.proof_category === 'Deposition' ? 'Deposition' : '—');
}

export function canPublishToJury(proof) {
  if (!proof) return false;
  return proof.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(proof.status);
}

export function canPublishToWitness(proof) {
  if (!proof) return false;
  return proof.proof_category === 'Deposition' || ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status);
}

export function getPublishedLabel(proof) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return getProofDisplayLabel(proof);
  const exhibitNumber = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '';
  if (proof.status === 'Demonstrative') return exhibitNumber ? `Demonstrative ${exhibitNumber}` : 'Demonstrative';
  return exhibitNumber ? `Exhibit ${exhibitNumber}` : 'Exhibit';
}

export function getTopAncestorId(proofId, proofsById) {
  let current = proofsById[proofId];
  while (current?.parent_proof_id && proofsById[current.parent_proof_id]) {
    current = proofsById[current.parent_proof_id];
  }
  return current?.id || proofId;
}

export function buildProofFamilyLanes(baseProofs = [], allProofs = []) {
  const proofsById = Object.fromEntries(allProofs.map((proof) => [proof.id, proof]));
  const childrenByParent = allProofs.reduce((acc, proof) => {
    if (!proof.parent_proof_id) return acc;
    acc[proof.parent_proof_id] = [...(acc[proof.parent_proof_id] || []), proof];
    return acc;
  }, {});

  return baseProofs.map((parent) => {
    const ordered = [];
    const walk = (proof) => {
      ordered.push(proof);
      const children = [...(childrenByParent[proof.id] || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
      children.forEach(walk);
    };

    walk(proofsById[parent.id] || parent);
    return {
      id: parent.id,
      parent: proofsById[parent.id] || parent,
      items: ordered,
    };
  });
}

export function buildLinkedQuestionMap(examQuestionItems = [], legacyQuestions = []) {
  const map = {};
  const add = (proofId, label) => {
    if (!proofId) return;
    map[proofId] = map[proofId] || [];
    if (!map[proofId].includes(label)) map[proofId].push(label);
  };

  examQuestionItems
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach((item, index) => {
      parseIdsField(item.attached_proof_ids).forEach((proofId) => add(proofId, `Q${index + 1}`));
    });

  legacyQuestions
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach((item, index) => {
      parseIdsField(item.proof_ids).forEach((proofId) => add(proofId, `L${index + 1}`));
    });

  return map;
}

export function getRootProofItems(items = []) {
  return items
    .filter((item) => !item.parent_item_id && item.item_type !== 'question')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function truncateText(value, max = 72) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}