import React from 'react';
import { getStagePills } from './attorneyCentralUtils';

export default function ProofStagePills({ proof }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {getStagePills(proof).map((pill) => (
        <span
          key={pill.label}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${pill.classes}`}
        >
          <span className="opacity-70">{pill.label}:</span>
          <span>{pill.value}</span>
        </span>
      ))}
    </div>
  );
}