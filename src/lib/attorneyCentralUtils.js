import { getProofDisplayName, parseIdsField } from '@/lib/examV2Utils';

export function canPublishProof(proof, localDecision = null) {
  if (localDecision === 'not_admitted') return false;
  return proof?.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(proof?.status);
}

export function canPublishProofToWitness(proof) {
  return proof?.proof_category === 'Deposition' || ['Joint', 'Admitted', 'Demonstrative'].includes(proof?.status);
}

export function getPublishedLabel(proof) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return proof.formal_name || proof.name || 'Deposition';
  const exhibitNumber = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '';
  if (proof.status === 'Demonstrative') return exhibitNumber ? `Demonstrative ${exhibitNumber}` : 'Demonstrative';
  return exhibitNumber ? `Exhibit ${exhibitNumber}` : 'Exhibit';
}

export function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

export function getProofNumber(proof) {
  return proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num || '—';
}

export function getProofStatusConfig(proof, localDecision = null) {
  if (proof?.proof_category === 'Deposition') {
    return {
      label: 'Deposition',
      pill: 'border-amber-200 bg-amber-50 text-amber-700',
      accent: 'border-amber-300 bg-amber-100 text-amber-900',
    };
  }

  if (localDecision === 'not_admitted') {
    return {
      label: 'Rejected',
      pill: 'border-rose-200 bg-rose-50 text-rose-700',
      accent: 'border-rose-300 bg-rose-100 text-rose-900',
    };
  }

  if (proof?.status === 'Admitted') {
    return {
      label: 'Admitted',
      pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      accent: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    };
  }

  if (proof?.status === 'Demonstrative') {
    return {
      label: 'Demo',
      pill: 'border-violet-200 bg-violet-50 text-violet-700',
      accent: 'border-violet-300 bg-violet-100 text-violet-900',
    };
  }

  return {
    label: 'Marked',
    pill: 'border-sky-200 bg-sky-50 text-sky-700',
    accent: 'border-sky-300 bg-sky-100 text-sky-900',
  };
}

export function getProofKindLabel(proof) {
  if (!proof) return 'Proof';
  if (proof.proof_category === 'Deposition' && !proof.proof_child_type) return proof.file_type === 'Video' ? 'Video Deposition' : 'Deposition';
  if (proof.proof_child_type === 'Extract') return 'Extract';
  if (proof.proof_child_type === 'ExtractClip') return 'Extract Clip';
  if (proof.proof_child_type === 'VideoClip') return 'Video Clip';
  if (proof.file_type === 'Video') return 'Video Exhibit';
  if (proof.file_type === 'Image') return 'Image Exhibit';
  return 'Exhibit';
}

export function getProofMetaLine(proof) {
  if (!proof) return '';
  if (proof.proof_child_type === 'Extract' && proof.extract_pages) return `Pages ${proof.extract_pages}`;
  if (proof.proof_child_type === 'ExtractClip' && proof.clipped_page) return `Clip page ${proof.clipped_page}`;
  if (proof.proof_child_type === 'VideoClip') return `${(proof.video_clips || []).length} clip step${(proof.video_clips || []).length === 1 ? '' : 's'}`;
  return proof.file_type || proof.proof_category || '';
}

export function getProofPrimaryName(proof) {
  return proof?.name || proof?.formal_name || getProofDisplayName(proof);
}

export function getProofHistoryChips(proof) {
  return [
    { key: 'joint', label: 'J', value: proof?.joint_exhibit_num || '—', className: 'bg-sky-50 text-sky-700 border-sky-200' },
    { key: 'admitted', label: 'Adm', value: proof?.admitted_exhibit_num || '—', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'demo', label: 'Demo', value: proof?.demonstrative_exhibit_num || '—', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  ];
}

export function buildChildrenMap(proofs = []) {
  return proofs.reduce((acc, proof) => {
    if (!proof?.parent_proof_id) return acc;
    if (!acc[proof.parent_proof_id]) acc[proof.parent_proof_id] = [];
    acc[proof.parent_proof_id].push(proof);
    acc[proof.parent_proof_id].sort((a, b) => String(getProofDisplayName(a)).localeCompare(String(getProofDisplayName(b)), undefined, { sensitivity: 'base' }));
    return acc;
  }, {});
}

export function countQuestionLinks(proofId, examItems = []) {
  return examItems.filter((item) => item.item_type === 'question' && parseIdsField(item.attached_proof_ids).includes(proofId)).length;
}

export function buildQuestionTree(questionItems = [], parentId = null) {
  return questionItems
    .filter((item) => item.parent_item_id === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item) => ({
      ...item,
      children: buildQuestionTree(questionItems, item.id),
    }));
}