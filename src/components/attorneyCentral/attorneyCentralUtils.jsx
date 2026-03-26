export function parseIdsField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((item) => item.replace(/['"]/g, '').trim())
        .filter(Boolean);
    }

    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'object') {
    return Object.values(value).filter((item) => typeof item === 'string' && item);
  }

  return [];
}

export function getProofDisplayName(proof) {
  return proof?.formal_name || proof?.name || 'Untitled proof';
}

export function getProofExhibitNumber(proof) {
  if (!proof) return '';
  return proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || proof.draft_exhibit_num || '';
}

export function getProofStatusClasses(proof) {
  if (proof?.proof_category === 'Deposition') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (proof?.status === 'Admitted') return 'border-green-200 bg-green-50 text-green-700';
  if (proof?.status === 'Joint') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (proof?.status === 'Demonstrative') return 'border-purple-200 bg-purple-50 text-purple-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

export function getProofStatusLabel(proof) {
  if (proof?.proof_category === 'Deposition') return 'Deposition';
  return proof?.status || 'Draft';
}

export function getPartyTone(side) {
  if (side === 'Plaintiff') return 'border-green-200 bg-green-50 text-green-700';
  if (side === 'Defense') return 'border-red-200 bg-red-50 text-red-700';
  if (side === 'Neutral') return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export function getProofPartyNames(proof, partiesById) {
  const ids = [...new Set([proof?.party_id, ...parseIdsField(proof?.party_ids)].filter(Boolean))];
  return ids
    .map((partyId) => {
      const party = partiesById[partyId];
      return party ? `${party.first_name} ${party.last_name}`.trim() : '';
    })
    .filter(Boolean);
}

export function canPublishToJury(proof) {
  return proof?.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(proof?.status);
}

export function canPublishToWitness(proof) {
  return proof?.proof_category === 'Deposition' || ['Joint', 'Admitted', 'Demonstrative'].includes(proof?.status);
}

export function getPublishedLabel(proof) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return getProofDisplayName(proof);

  const exhibitNumber = getProofExhibitNumber(proof);
  if (proof.status === 'Demonstrative') {
    return exhibitNumber ? `Demonstrative ${exhibitNumber}` : 'Demonstrative';
  }

  return exhibitNumber ? `Exhibit ${exhibitNumber}` : 'Exhibit';
}