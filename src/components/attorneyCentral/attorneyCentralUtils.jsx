export function parseArrayValue(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function parseIdArray(value) {
  return parseArrayValue(value)
    .map((item) => (typeof item === 'string' ? item : item?.id))
    .filter(Boolean);
}

export function isAuthenticatedProof(proof) {
  return Boolean(proof?.witness_name || proof?.witness_markup) && !['Admitted', 'Demonstrative'].includes(proof?.status);
}

export function getDisplayStatus(proof) {
  if (isAuthenticatedProof(proof)) return 'Authenticated';
  if (proof?.proof_category === 'Deposition') return 'Deposition';
  return proof?.status || 'Draft';
}

export function getStatusClasses(proof) {
  const status = getDisplayStatus(proof);

  return {
    Draft: 'border-slate-200 bg-slate-100 text-slate-700',
    Joint: 'border-blue-200 bg-blue-100 text-blue-700',
    Admitted: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    Demonstrative: 'border-purple-200 bg-purple-100 text-purple-700',
    Authenticated: 'border-amber-200 bg-amber-100 text-amber-700',
    Deposition: 'border-orange-200 bg-orange-100 text-orange-700',
  }[status] || 'border-slate-200 bg-slate-100 text-slate-700';
}

export function getProofTypeLabel(proof) {
  if (proof?.proof_child_type === 'ExtractClip') return 'Extract Clip';
  if (proof?.proof_child_type === 'Extract') return 'Extract';
  if (proof?.proof_child_type === 'VideoClip') return 'Video Clip';
  if (proof?.file_type === 'Image') return 'Image';
  if (proof?.file_type === 'Video') return 'Video';
  return 'PDF';
}

export function getTypeClasses(proof) {
  return {
    PDF: 'border-sky-200 bg-sky-100 text-sky-700',
    Image: 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700',
    Video: 'border-rose-200 bg-rose-100 text-rose-700',
    Extract: 'border-cyan-200 bg-cyan-100 text-cyan-700',
    'Extract Clip': 'border-teal-200 bg-teal-100 text-teal-700',
    'Video Clip': 'border-violet-200 bg-violet-100 text-violet-700',
  }[getProofTypeLabel(proof)] || 'border-slate-200 bg-slate-100 text-slate-700';
}

export function getPrimaryExhibitLabel(proof) {
  if (proof?.proof_category === 'Deposition') return 'Deposition';
  if (proof?.status === 'Admitted' && proof?.admitted_exhibit_num) return `Adm ${proof.admitted_exhibit_num}`;
  if (proof?.status === 'Demonstrative' && (proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num)) {
    return `Demo ${proof.demonstrative_exhibit_num || proof.joint_exhibit_num}`;
  }
  if (proof?.status === 'Joint' && proof?.joint_exhibit_num) return `J ${proof.joint_exhibit_num}`;
  if (proof?.draft_exhibit_num) return `D ${proof.draft_exhibit_num}`;
  return 'Unnumbered';
}

export function getStagePills(proof) {
  return [
    { label: 'D', value: proof?.draft_exhibit_num || '—', classes: 'border-slate-200 bg-slate-100 text-slate-700' },
    { label: 'J', value: proof?.joint_exhibit_num || '—', classes: 'border-blue-200 bg-blue-100 text-blue-700' },
    { label: 'Adm', value: proof?.admitted_exhibit_num || '—', classes: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
    { label: 'Demo', value: proof?.demonstrative_exhibit_num || (proof?.status === 'Demonstrative' ? proof?.joint_exhibit_num || '—' : '—'), classes: 'border-purple-200 bg-purple-100 text-purple-700' },
  ];
}

export function getRelationLabel(proof) {
  if (proof?.proof_child_type === 'Extract') {
    return proof?.extract_pages ? `Extract pages ${proof.extract_pages}` : 'Extract';
  }

  if (proof?.proof_child_type === 'ExtractClip') {
    return proof?.clipped_page ? `Clip from extract · page ${proof.clipped_page}` : 'Clip from extract';
  }

  if (proof?.proof_child_type === 'VideoClip') {
    const segmentCount = parseArrayValue(proof?.video_clips).length;
    return segmentCount ? `Video clip · ${segmentCount} segment${segmentCount === 1 ? '' : 's'}` : 'Video clip';
  }

  if (proof?.proof_category === 'Deposition') return 'Deposition proof';
  if (proof?.file_type === 'Image') return 'Image exhibit';
  if (proof?.file_type === 'Video') return 'Video exhibit';
  return 'PDF exhibit';
}

function getSortKey(proof) {
  return [
    proof?.admitted_exhibit_num,
    proof?.demonstrative_exhibit_num,
    proof?.joint_exhibit_num,
    proof?.draft_exhibit_num,
    proof?.formal_name,
    proof?.name,
  ].find(Boolean) || '';
}

function getDepthRank(proof) {
  if (proof?.proof_child_type === 'Extract') return 0;
  if (proof?.proof_child_type === 'ExtractClip') return 1;
  if (proof?.proof_child_type === 'VideoClip') return 1;
  return 0;
}

function sortProofs(a, b) {
  return getDepthRank(a) - getDepthRank(b)
    || getSortKey(a).localeCompare(getSortKey(b), undefined, { numeric: true, sensitivity: 'base' })
    || (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' });
}

export function buildProofCollections(proofs) {
  const proofById = Object.fromEntries(proofs.map((proof) => [proof.id, proof]));
  const childrenByParent = proofs.reduce((acc, proof) => {
    if (!proof?.parent_proof_id) return acc;
    acc[proof.parent_proof_id] = [...(acc[proof.parent_proof_id] || []), proof];
    return acc;
  }, {});

  Object.keys(childrenByParent).forEach((parentId) => {
    childrenByParent[parentId] = childrenByParent[parentId].sort(sortProofs);
  });

  const hiddenRootIds = new Set(
    proofs
      .filter((proof) => !proof.parent_proof_id && (childrenByParent[proof.id] || []).length > 0)
      .map((proof) => proof.id)
  );

  const displayRoots = proofs
    .filter((proof) => {
      if (hiddenRootIds.has(proof.id)) return false;
      if (!proof.parent_proof_id) return true;
      return hiddenRootIds.has(proof.parent_proof_id);
    })
    .sort(sortProofs);

  return {
    proofById,
    childrenByParent,
    hiddenRootIds,
    exhibitRoots: displayRoots.filter((proof) => proof.proof_category !== 'Deposition'),
    depositionRoots: displayRoots.filter((proof) => proof.proof_category === 'Deposition'),
  };
}

export function getProofLineageIds(proof, proofById) {
  const ids = [];
  let current = proof;

  while (current) {
    ids.push(current.id);
    current = current.parent_proof_id ? proofById[current.parent_proof_id] : null;
  }

  return ids;
}

export function isQuestionLinkedToProof(question, proof, proofById) {
  const questionProofIds = parseIdArray(question?.proof_ids);
  const lineageIds = new Set(getProofLineageIds(proof, proofById));
  return questionProofIds.some((proofId) => lineageIds.has(proofId));
}

export function resolveSelectableProofId(proofId, proofById, childrenByParent, hiddenRootIds) {
  if (!hiddenRootIds.has(proofId)) return proofId;
  const firstVisibleChild = (childrenByParent[proofId] || []).find(Boolean);
  return firstVisibleChild?.id || proofId;
}