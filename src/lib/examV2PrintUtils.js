export function getProofPrintMeta(proof, proofsById = {}) {
  if (!proof) {
    return { statusLabel: 'Question Group', exhibitLabel: '', tone: 'text-slate-600' };
  }

  const parentProof = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
  const source = proof.status === 'Admitted' || proof.status === 'Demonstrative' || proof.status === 'Joint'
    ? proof
    : parentProof || proof;

  if (source.status === 'Admitted') {
    return {
      statusLabel: 'As Exhibit',
      exhibitLabel: source.admitted_exhibit_num ? `Admitted # ${source.admitted_exhibit_num}` : 'Admitted',
      tone: 'text-red-700',
    };
  }

  if (source.status === 'Demonstrative') {
    return {
      statusLabel: 'As Demo',
      exhibitLabel: source.demonstrative_exhibit_num || source.joint_exhibit_num ? `Demo # ${source.demonstrative_exhibit_num || source.joint_exhibit_num}` : 'Demonstrative',
      tone: 'text-purple-700',
    };
  }

  if (source.joint_exhibit_num) {
    return {
      statusLabel: 'Joint',
      exhibitLabel: `Joint # ${source.joint_exhibit_num}`,
      tone: 'text-blue-700',
    };
  }

  return {
    statusLabel: 'Not Admitted',
    exhibitLabel: '',
    tone: 'text-slate-600',
  };
}