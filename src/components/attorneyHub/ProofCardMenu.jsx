import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';

export default function ProofCardMenu({ proof, selectedParty, localDecision, onAction }) {
  const [open, setOpen] = useState(false);
  const side = selectedParty?.side === 'Plaintiff' || selectedParty?.side === 'Defense'
    ? selectedParty.side
    : proof?.joint_by || proof?.admitted_by || 'Plaintiff';

  const close = () => setOpen(false);

  const handleAdmit = () => {
    const admittedNum = window.prompt('Admitted exhibit #', proof?.admitted_exhibit_num || proof?.joint_exhibit_num || '');
    if (!admittedNum || !admittedNum.trim()) return;
    onAction('admit', {
      status: 'Admitted',
      admitted_exhibit_num: admittedNum.trim(),
      admitted_by: side,
      admit_date: new Date().toISOString().slice(0, 10),
    });
    close();
  };

  const handleDemo = () => {
    onAction('demo', {
      status: 'Demonstrative',
      demonstrative_exhibit_num: proof?.joint_exhibit_num || proof?.demonstrative_exhibit_num || '',
    });
    close();
  };

  const handleUnadmit = () => {
    onAction('unadmit', proof?.status === 'Demonstrative'
      ? { status: 'Joint', demonstrative_exhibit_num: null }
      : { status: 'Joint', admitted_exhibit_num: null, admitted_by: null, admit_date: null }
    );
    close();
  };

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-7 w-7 rounded-md border border-slate-600 bg-slate-800/90 flex items-center justify-center text-slate-300 hover:text-white"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-slate-700 bg-slate-900 p-1.5 shadow-xl">
          <button type="button" onClick={handleAdmit} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800">Admit as Exhibit</button>
          <button type="button" onClick={handleDemo} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800">Admit as Demo</button>
          <button type="button" onClick={() => { onAction('not_admitted'); close(); }} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800">{localDecision === 'not_admitted' ? 'Clear Not Admitted' : 'Mark Not Admitted'}</button>
          {(proof?.status === 'Admitted' || proof?.status === 'Demonstrative') && (
            <button type="button" onClick={handleUnadmit} className="w-full text-left rounded-md px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800">Un-Admit</button>
          )}
        </div>
      )}
    </div>
  );
}