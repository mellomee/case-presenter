export function collectDescendantProofs(proofs = [], parentId) {
  const children = proofs.filter((proof) => proof.parent_proof_id === parentId);
  return children.flatMap((child) => [child, ...collectDescendantProofs(proofs, child.id)]);
}

export function getProofRoot(proof, proofsById = {}) {
  if (!proof) return null;

  let current = proof;
  while (current?.parent_proof_id && proofsById[current.parent_proof_id]) {
    current = proofsById[current.parent_proof_id];
  }

  return current;
}

export function getNearestJointExhibitNumber(proof, proofsById = {}) {
  let current = proof;

  while (current) {
    if (current.joint_exhibit_num) return current.joint_exhibit_num;
    current = current.parent_proof_id ? proofsById[current.parent_proof_id] || null : null;
  }

  return '';
}

export function getProofHierarchyLabel(proof, proofsById = {}) {
  if (!proof?.parent_proof_id) return 'Parent';
  const parent = proofsById[proof.parent_proof_id];
  return parent?.parent_proof_id ? 'Grandchild' : 'Child';
}

export function getProofStatusLabel(proof) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return 'Deposition';

  if (proof.status === 'Admitted') {
    return proof.proof_child_type ? `Admitted ${proof.proof_child_type}` : 'Admitted';
  }

  if (proof.status === 'Demonstrative') {
    return proof.proof_child_type ? `Demonstrative ${proof.proof_child_type}` : 'Demonstrative';
  }

  if (proof.status === 'Joint') {
    return proof.proof_child_type ? `Joint ${proof.proof_child_type}` : 'Joint';
  }

  return proof.status || 'Draft';
}

export function getProofStatusTone(proof) {
  if (proof?.proof_category === 'Deposition') return 'bg-amber-100 text-amber-700';

  switch (proof?.status) {
    case 'Joint':
      return 'bg-blue-100 text-blue-700';
    case 'Admitted':
      return 'bg-green-100 text-green-700';
    case 'Demonstrative':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function isProofSelectableForExamBuilder(proof, proofsById = {}) {
  if (!proof) return false;
  if (proof.proof_category === 'Deposition') return true;

  const rootProof = getProofRoot(proof, proofsById);
  return ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status) || ['Joint', 'Admitted', 'Demonstrative'].includes(rootProof?.status);
}