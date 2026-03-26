import React from 'react';
import { X } from 'lucide-react';
import ProofTile from './ProofTile';

function Section({ title, subtitle, proofs, ...props }) {
  if (proofs.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{proofs.length}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="space-y-4">
        {proofs.map((proof) => (
          <ProofTile key={proof.id} proof={proof} {...props} />
        ))}
      </div>
    </section>
  );
}

export default function ProofPanel({
  exhibitRoots,
  depositionRoots,
  childrenByParent,
  questionCountByProofId,
  selectedId,
  onSelect,
  mobile = false,
  open = true,
  onClose,
}) {
  const shellClasses = mobile
    ? `fixed inset-y-0 left-0 z-50 w-[92vw] max-w-[420px] transform border-r border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`
    : 'flex h-full flex-col rounded-[32px] border border-slate-200 bg-white/90 shadow-xl backdrop-blur';

  return (
    <aside className={shellClasses}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Attorney Central</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Marked Exhibits</h2>
        </div>
        {mobile && (
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto px-4 py-5">
        <Section
          title="Exhibits"
          subtitle="Large, color-coded proof cards with extract and clip relationships always visible."
          proofs={exhibitRoots}
          childrenByParent={childrenByParent}
          questionCountByProofId={questionCountByProofId}
          selectedId={selectedId}
          onSelect={onSelect}
        />

        <Section
          title="Depositions"
          subtitle="Separate deposition lane so published testimony never gets mixed into exhibits."
          proofs={depositionRoots}
          childrenByParent={childrenByParent}
          questionCountByProofId={questionCountByProofId}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    </aside>
  );
}