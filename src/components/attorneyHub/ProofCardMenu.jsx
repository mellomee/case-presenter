import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';

export default function ProofCardMenu({ proof, selectedParty, localDecision, onAction }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const handleAdmit = () => {
    onAction('admit');
    close();
  };

  const handleDemo = () => {
    onAction('demo');
    close();
  };

  const handleUnadmit = () => {
    onAction('unadmit');
    close();
  };

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-7 w-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 shadow-sm hover:text-slate-900"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
          {(proof?.status === 'Admitted' || proof?.status === 'Demonstrative') ? (
            <button type="button" onClick={handleUnadmit} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">Un-Admit</button>
          ) : (
            <>
              <button type="button" onClick={handleAdmit} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">Admit as Exhibit</button>
              <button type="button" onClick={handleDemo} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">Admit as Demo</button>
              <button type="button" onClick={() => { onAction('not_admitted'); close(); }} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">{localDecision === 'not_admitted' ? 'Clear Not Admitted' : 'Mark Not Admitted'}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}