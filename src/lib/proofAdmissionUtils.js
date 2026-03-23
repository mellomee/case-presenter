export function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

export function isProofAdmissionNumberUsed(proofs = [], proof = null, exhibitNum = '') {
  const normalizedValue = String(exhibitNum || '').trim().toLowerCase();
  if (!normalizedValue) return false;

  const childIds = new Set(
    proofs
      .filter((item) => item.parent_proof_id === proof?.id)
      .map((item) => item.id)
  );

  return proofs.some((item) => {
    if (item.id === proof?.id || childIds.has(item.id)) return false;

    return [item.admitted_exhibit_num, item.demonstrative_exhibit_num]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalizedValue);
  });
}