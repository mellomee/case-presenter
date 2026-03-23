import React from 'react';

export default function ProofCardMenu({
  proof,
  localDecision,
  onAction,
  canPublish = false,
  isPublished = false,
  onPublish,
  onUnpublish,
}) {
  const isExhibit = proof?.proof_category === 'Exhibit';
  const isRejected = isExhibit && localDecision === 'not_admitted';
  const canAdmit = isExhibit && proof?.status === 'Joint' && !isRejected;
  const canUnadmit = isExhibit && ['Admitted', 'Demonstrative'].includes(proof?.status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      {canAdmit && (
        <>
          <button type="button" onClick={() => onAction('admit')} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">
            Admit Exhibit
          </button>
          <button type="button" onClick={() => onAction('demo')} className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100">
            Admit Demo
          </button>
          <button type="button" onClick={() => onAction('not_admitted')} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100">
            Admit Rejected
          </button>
        </>
      )}

      {canUnadmit && (
        <button type="button" onClick={() => onAction('unadmit')} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
          Un-Admit
        </button>
      )}

      {isRejected && (
        <button type="button" onClick={() => onAction('not_admitted')} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100">
          Un-Reject
        </button>
      )}

      {canPublish && !isPublished && (
        <button type="button" onClick={onPublish} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
          Publish
        </button>
      )}

      {canPublish && isPublished && (
        <button type="button" onClick={onUnpublish} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
          Unpublish
        </button>
      )}
    </div>
  );
}