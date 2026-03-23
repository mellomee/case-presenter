import React from 'react';
import { Button } from '@/components/ui/button';
import { getNearestJointExhibitNumber, getProofStatusLabel, getProofStatusTone } from '@/lib/proofStatusUtils';

export default function ProofAdmissionToolbar({
  proof,
  proofsById = {},
  onAdmitAsExhibit,
  onAdmitAsDemonstrative,
  onUnAdmit,
}) {
  if (!proof) return null;

  const jointNumber = getNearestJointExhibitNumber(proof, proofsById);
  const isExhibit = proof.proof_category === 'Exhibit';
  const canAdmit = isExhibit && proof.status === 'Joint';
  const canUnAdmit = isExhibit && ['Admitted', 'Demonstrative'].includes(proof.status);

  return (
    <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${getProofStatusTone(proof)}`}>
            {getProofStatusLabel(proof)}
          </span>
          {jointNumber && <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300">Joint # {jointNumber}</span>}
          {proof.admitted_exhibit_num && <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300">Admitted # {proof.admitted_exhibit_num}</span>}
          {proof.demonstrative_exhibit_num && <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300">Demo # {proof.demonstrative_exhibit_num}</span>}
        </div>

        {isExhibit && (
          <div className="flex flex-wrap gap-2">
            {canAdmit && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onAdmitAsExhibit(proof)}>
                  Admit as Exhibit
                </Button>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => onAdmitAsDemonstrative(proof)}>
                  Admit as Demo
                </Button>
              </>
            )}
            {canUnAdmit && (
              <Button size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => onUnAdmit(proof)}>
                Un-Admit
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}