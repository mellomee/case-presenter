import React from 'react';
import { Button } from '@/components/ui/button';
import { getProofDisplayName } from '@/lib/examV2Utils';

function getStatusMeta(proof) {
  if (proof?.status === 'Admitted') {
    return {
      label: 'Admitted as Exhibit',
      number: proof.admitted_exhibit_num || '—',
      badgeClass: 'bg-green-100 text-green-700 border-green-200',
      numberLabel: 'Exhibit #',
    };
  }

  if (proof?.status === 'Demonstrative') {
    return {
      label: 'Admitted as Demonstrative',
      number: proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '—',
      badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
      numberLabel: 'Exhibit #',
    };
  }

  if (proof?.status === 'Joint') {
    return {
      label: 'Joint Exhibit',
      number: proof.joint_exhibit_num || '—',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      numberLabel: 'Joint #',
    };
  }

  return null;
}

export default function PreviewRulingToolbar({ proof, onAdmitExhibit, onAdmitDemo, onUnAdmit }) {
  if (!proof || proof.proof_category !== 'Exhibit') return null;

  const statusMeta = getStatusMeta(proof);
  const canPromote = proof.status === 'Joint';
  const canUnAdmit = proof.status === 'Admitted' || proof.status === 'Demonstrative';

  return (
    <div className="border-b border-slate-800 bg-slate-900/90 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{getProofDisplayName(proof)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {statusMeta && <span className={`rounded-full border px-2.5 py-1 font-semibold ${statusMeta.badgeClass}`}>{statusMeta.label}</span>}
            {statusMeta && <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300">{statusMeta.numberLabel} {statusMeta.number}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canPromote && (
            <>
              <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => onAdmitExhibit(proof)}>
                Admit as Exhibit
              </Button>
              <Button className="bg-purple-600 text-white hover:bg-purple-700" onClick={() => onAdmitDemo(proof)}>
                Admit as Demonstrative
              </Button>
            </>
          )}
          {canUnAdmit && (
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => onUnAdmit(proof)}>
              Un-Admit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}