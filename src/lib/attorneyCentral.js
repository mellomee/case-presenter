export const MOCK_PROOFS = [
  {
    id: 'demo-extract-1',
    proof_category: 'Exhibit',
    file_type: 'PDF',
    proof_child_type: 'Extract',
    name: 'ER Photo Extract',
    formal_name: 'Emergency Room Records Extract',
    status: 'Joint',
    joint_exhibit_num: 'J-12',
    extract_pages: '4-8',
    updated_date: '2026-03-26T10:00:00.000Z',
  },
  {
    id: 'demo-clip-1',
    proof_category: 'Exhibit',
    file_type: 'PDF',
    proof_child_type: 'ExtractClip',
    parent_proof_id: 'demo-extract-1',
    name: 'ER Signature Clip',
    formal_name: 'Signature Area',
    status: 'Admitted',
    admitted_exhibit_num: 'P-44',
    clipped_page: 1,
    updated_date: '2026-03-26T10:05:00.000Z',
  },
  {
    id: 'demo-clip-2',
    proof_category: 'Exhibit',
    file_type: 'PDF',
    proof_child_type: 'ExtractClip',
    parent_proof_id: 'demo-extract-1',
    name: 'Medication Order Clip',
    formal_name: 'Medication Order',
    status: 'Demonstrative',
    demonstrative_exhibit_num: 'D-17',
    clipped_page: 2,
    updated_date: '2026-03-26T10:10:00.000Z',
  },
  {
    id: 'demo-depo-1',
    proof_category: 'Deposition',
    file_type: 'Video',
    proof_child_type: 'VideoClip',
    name: 'Dr. Lin Video Clip',
    formal_name: 'Dr. Lin - Causation',
    status: 'Draft',
    video_clips: [
      { type: 'segment', start: '00:02:10', end: '00:02:40', label: 'Causation answer' },
    ],
    updated_date: '2026-03-26T10:15:00.000Z',
  },
];

export const MOCK_QUESTIONS = [
  {
    id: 'demo-question-1',
    text: 'Doctor, these are the records you reviewed before your opinion, correct?',
    type: 'Direct',
    proof_ids: ['demo-extract-1', 'demo-clip-1'],
    sort_order: 1,
  },
  {
    id: 'demo-question-2',
    text: 'And this video clip is your testimony on causation?',
    type: 'Cross',
    proof_ids: ['demo-depo-1'],
    sort_order: 2,
  },
];

const STATUS_STYLES = {
  Draft: 'border-zinc-700 bg-zinc-800/90 text-zinc-300',
  Joint: 'border-sky-500/35 bg-sky-500/12 text-sky-200',
  Admitted: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-200',
  Demonstrative: 'border-fuchsia-500/35 bg-fuchsia-500/12 text-fuchsia-200',
  Authenticated: 'border-amber-500/35 bg-amber-500/12 text-amber-200',
};

const TYPE_STYLES = {
  Extract: 'border-cyan-500/35 bg-cyan-500/12 text-cyan-200',
  ExtractClip: 'border-violet-500/35 bg-violet-500/12 text-violet-200',
  VideoClip: 'border-rose-500/35 bg-rose-500/12 text-rose-200',
  Deposition: 'border-orange-500/35 bg-orange-500/12 text-orange-200',
  PDF: 'border-blue-500/35 bg-blue-500/12 text-blue-200',
  Video: 'border-rose-500/35 bg-rose-500/12 text-rose-200',
  Image: 'border-lime-500/35 bg-lime-500/12 text-lime-200',
};

const HISTORY_STYLES = {
  draft: 'bg-zinc-800 text-zinc-300',
  joint: 'bg-sky-500/15 text-sky-200',
  admitted: 'bg-emerald-500/15 text-emerald-200',
  demo: 'bg-fuchsia-500/15 text-fuchsia-200',
};

export function normalizeProofIds(proofIds) {
  if (Array.isArray(proofIds)) return proofIds;
  if (Array.isArray(proofIds?.ids)) return proofIds.ids;
  return [];
}

export function isAuthenticatedProof(proof) {
  return Boolean(proof?.witness_name || proof?.witness_markup) && !['Admitted', 'Demonstrative'].includes(proof?.status);
}

export function getProofStatusLabel(proof) {
  return isAuthenticatedProof(proof) ? 'Authenticated' : (proof?.status || 'Draft');
}

export function getStatusClasses(proof) {
  return STATUS_STYLES[getProofStatusLabel(proof)] || STATUS_STYLES.Draft;
}

export function getTypeLabel(proof) {
  if (proof?.proof_category === 'Deposition' && !proof?.proof_child_type) return 'Deposition';
  return proof?.proof_child_type || proof?.file_type || 'Proof';
}

export function getTypeClasses(proof) {
  return TYPE_STYLES[getTypeLabel(proof)] || TYPE_STYLES[proof?.file_type] || TYPE_STYLES.PDF;
}

export function getExhibitNumber(proof) {
  return proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num || proof?.draft_exhibit_num || '—';
}

export function getExhibitTrail(proof) {
  return [
    { label: 'D', value: proof?.draft_exhibit_num || '—', classes: HISTORY_STYLES.draft },
    { label: 'J', value: proof?.joint_exhibit_num || '—', classes: HISTORY_STYLES.joint },
    { label: 'Adm', value: proof?.admitted_exhibit_num || '—', classes: HISTORY_STYLES.admitted },
    { label: 'Demo', value: proof?.demonstrative_exhibit_num || '—', classes: HISTORY_STYLES.demo },
  ];
}

export function canPublishToJury(proof) {
  if (!proof) return false;
  if (proof.proof_category === 'Deposition') return true;
  return ['Admitted', 'Demonstrative'].includes(proof.status);
}

export function getJuryLabel(proof) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return proof.formal_name || proof.name || 'Deposition';
  const num = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '';
  return num ? `Exhibit ${num}` : (proof.formal_name || proof.name || 'Exhibit');
}

export function sortByFreshness(items = []) {
  return [...items].sort((a, b) => new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0));
}

export function buildProofFamilies(proofs = []) {
  const byId = new Map(proofs.map((proof) => [proof.id, proof]));
  const childrenByParent = proofs.reduce((map, proof) => {
    if (!proof.parent_proof_id) return map;
    const existing = map.get(proof.parent_proof_id) || [];
    existing.push(proof);
    map.set(proof.parent_proof_id, existing);
    return map;
  }, new Map());

  const roots = [];
  const added = new Set();

  proofs.forEach((proof) => {
    const children = childrenByParent.get(proof.id) || [];
    const hasVisibleChildren = children.some((child) => ['Extract', 'ExtractClip', 'VideoClip'].includes(child.proof_child_type));

    if (!proof.parent_proof_id) {
      if (hasVisibleChildren) {
        children
          .filter((child) => child.proof_child_type === 'Extract' || child.proof_child_type === 'VideoClip')
          .forEach((child) => {
            if (!added.has(child.id)) {
              roots.push(child);
              added.add(child.id);
            }
          });
      } else if (!added.has(proof.id)) {
        roots.push(proof);
        added.add(proof.id);
      }
      return;
    }

    if ((proof.proof_child_type === 'Extract' || proof.proof_child_type === 'VideoClip') && !added.has(proof.id)) {
      roots.push(proof);
      added.add(proof.id);
    }

    const parent = byId.get(proof.parent_proof_id);
    if (proof.proof_child_type === 'ExtractClip' && parent?.proof_child_type !== 'Extract' && !added.has(proof.id)) {
      roots.push(proof);
      added.add(proof.id);
    }
  });

  return sortByFreshness(roots).map((root) => ({
    root,
    children: sortByFreshness((childrenByParent.get(root.id) || []).filter((child) => ['ExtractClip', 'VideoClip'].includes(child.proof_child_type))),
  }));
}

export function getFamilyForProof(families = [], proofId) {
  return families.find((family) => family.root.id === proofId || family.children.some((child) => child.id === proofId)) || null;
}

export function getLinkedProofs(question, proofMap) {
  return normalizeProofIds(question?.proof_ids)
    .map((proofId) => proofMap.get(proofId))
    .filter(Boolean);
}