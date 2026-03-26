import { parseIdsField } from '@/lib/examV2Utils';

function compareProofNumbers(a, b) {
  const first = String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
  if (first !== 0) return first;
  return 0;
}

export function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function canPublishProof(proof, localDecision = null) {
  if (!proof) return false;
  if (localDecision === 'not_admitted') return false;
  return proof.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(proof.status);
}

export function canPublishProofToWitness(proof) {
  if (!proof) return false;
  return proof.proof_category === 'Deposition' || ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status);
}

export function getPublishedLabel(proof) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return proof.formal_name || proof.name || 'Deposition';
  const exhibitNumber = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '';
  if (proof.status === 'Demonstrative') return exhibitNumber ? `Demonstrative ${exhibitNumber}` : 'Demonstrative';
  return exhibitNumber ? `Exhibit ${exhibitNumber}` : 'Exhibit';
}

export function getProofNumber(proof) {
  if (!proof) return '—';
  return proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '—';
}

export function isProofAuthenticated(proof) {
  return Boolean(proof?.witness_name) && !['Admitted', 'Demonstrative'].includes(proof?.status);
}

export function getProofStatusMeta(proof, localDecision = null) {
  if (!proof) return { label: 'None', className: 'bg-slate-200 text-slate-700 border-slate-300' };
  if (localDecision === 'not_admitted') return { label: 'Rejected', className: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (proof.proof_category === 'Deposition') return { label: 'Deposition', className: 'bg-orange-100 text-orange-800 border-orange-200' };
  if (proof.status === 'Admitted') return { label: 'Admitted', className: 'bg-green-100 text-green-800 border-green-200' };
  if (proof.status === 'Demonstrative') return { label: 'Demonstrative', className: 'bg-purple-100 text-purple-800 border-purple-200' };
  if (isProofAuthenticated(proof)) return { label: 'Authenticated', className: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (proof.status === 'Joint') return { label: 'Marked', className: 'bg-blue-100 text-blue-800 border-blue-200' };
  return { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export function getProofTypeMeta(proof) {
  if (!proof) return { label: 'Proof', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (proof.proof_category === 'Deposition') return { label: proof.proof_child_type || proof.file_type || 'Deposition', className: 'bg-rose-100 text-rose-800 border-rose-200' };
  if (proof.proof_child_type === 'ExtractClip') return { label: 'Extract Clip', className: 'bg-teal-100 text-teal-800 border-teal-200' };
  if (proof.proof_child_type === 'Extract') return { label: 'Extract', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
  if (proof.proof_child_type === 'VideoClip') return { label: 'Video Clip', className: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' };
  if (proof.file_type === 'Video') return { label: 'Video', className: 'bg-violet-100 text-violet-800 border-violet-200' };
  if (proof.file_type === 'Image') return { label: 'Image', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
  return { label: 'PDF', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export function getLinkedProofIds(question) {
  return parseIdsField(question?.attached_proof_ids || question?.proof_ids);
}

export function buildProofBrowserSections(proofs = []) {
  const byId = Object.fromEntries(proofs.map((proof) => [proof.id, proof]));
  const childrenByParent = proofs.reduce((acc, proof) => {
    if (!proof.parent_proof_id) return acc;
    acc[proof.parent_proof_id] = acc[proof.parent_proof_id] || [];
    acc[proof.parent_proof_id].push(proof);
    return acc;
  }, {});

  const roots = proofs.filter((proof) => {
    if (!proof.parent_proof_id) {
      return (childrenByParent[proof.id] || []).length === 0;
    }
    const parent = byId[proof.parent_proof_id];
    return Boolean(parent && !parent.parent_proof_id);
  });

  return roots
    .map((root) => ({
      root,
      children: [...(childrenByParent[root.id] || [])].sort((a, b) => compareProofNumbers(getProofNumber(a), getProofNumber(b)) || String(a.name || '').localeCompare(String(b.name || ''))),
    }))
    .sort((a, b) => compareProofNumbers(getProofNumber(a.root), getProofNumber(b.root)) || String(a.root.name || '').localeCompare(String(b.root.name || '')));
}