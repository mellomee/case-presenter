import React from 'react';
import { Handle, Position } from '@xyflow/react';

function Badge({ label, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-800 text-slate-300 border border-slate-700',
    blue: 'bg-blue-500/15 text-blue-200 border border-blue-400/30',
    green: 'bg-green-500/15 text-green-200 border border-green-400/30',
    amber: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
    red: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
    purple: 'bg-purple-500/15 text-purple-200 border border-purple-400/30',
  };

  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tones[tone] || tones.slate}`}>{label}</span>;
}

export default function MapNode({ data }) {
  const styles = {
    witness: 'border-slate-500 bg-slate-900 text-white',
    trialPoint: 'border-cyan-400/50 bg-cyan-500/12 text-white',
    bucket: 'border-indigo-400/50 bg-indigo-500/14 text-white',
    question: 'border-blue-400/40 bg-blue-500/10 text-white',
    proofGate: 'border-amber-400/50 bg-amber-500/12 text-white',
    admittedPath: 'border-emerald-400/50 bg-emerald-500/12 text-white',
    notAdmittedPath: 'border-rose-400/50 bg-rose-500/12 text-white',
  };

  return (
    <div className={`min-w-[220px] max-w-[280px] rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${styles[data.variant] || styles.witness} ${data.selected ? 'ring-2 ring-white/80' : ''}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-slate-400" />
      {data.kicker && <p className="text-[10px] uppercase tracking-[0.22em] text-slate-300">{data.kicker}</p>}
      <div className="mt-1 space-y-2">
        <div>
          <p className="text-sm font-semibold leading-snug">{data.title}</p>
          {data.subtitle && <p className="mt-1 text-xs text-slate-300">{data.subtitle}</p>}
        </div>
        {data.metrics?.length > 0 && (
          <div className="space-y-1">
            {data.metrics.map((metric) => (
              <p key={metric} className="text-[11px] text-slate-200">{metric}</p>
            ))}
          </div>
        )}
        {data.badges?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.badges.map((badge) => <Badge key={`${badge.label}-${badge.tone}`} {...badge} />)}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-slate-400" />
    </div>
  );
}