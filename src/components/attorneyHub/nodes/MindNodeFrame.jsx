import React from 'react';
import { Handle, Position } from '@xyflow/react';

const toneClasses = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  teal: 'bg-cyan-100 text-cyan-700 border-cyan-200'
};

export default function MindNodeFrame({
  title,
  subtitle,
  badges = [],
  meta = [],
  accent = '#2563eb',
  filled = false,
  circle = false,
  selected = false,
  compact = false,
}) {
  const textClass = filled ? 'text-white' : 'text-slate-900';
  const subTextClass = filled ? 'text-white/80' : 'text-slate-500';
  const shellClass = circle ? 'rounded-full' : 'rounded-[28px]';
  const sizeClass = compact ? 'min-w-[150px]' : 'min-w-[180px]';

  return (
    <div
      className={`${shellClass} ${sizeClass} border-2 px-4 py-4 shadow-lg transition-all ${filled ? 'text-white' : 'bg-white'} ${selected ? 'scale-[1.02]' : ''}`}
      style={{
        borderColor: accent,
        backgroundColor: filled ? accent : '#ffffff',
        boxShadow: selected ? `0 0 0 4px ${accent}22, 0 12px 30px rgba(15, 23, 42, 0.16)` : '0 10px 24px rgba(15, 23, 42, 0.12)',
      }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <div className={`space-y-2 ${circle ? 'text-center' : ''}`}>
        <div>
          <p className={`text-sm font-semibold leading-tight ${textClass}`}>{title}</p>
          {subtitle ? <p className={`mt-1 text-xs leading-snug ${subTextClass}`}>{subtitle}</p> : null}
        </div>

        {meta.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 ${circle ? 'justify-center' : ''}`}>
            {meta.map((item) => (
              <span key={item} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${filled ? 'bg-white/15 text-white/90' : 'bg-slate-100 text-slate-600'}`}>
                {item}
              </span>
            ))}
          </div>
        )}

        {badges.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 ${circle ? 'justify-center' : ''}`}>
            {badges.map((badge) => (
              <span
                key={`${badge.label}-${badge.tone}`}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filled ? 'border-white/20 bg-white/12 text-white' : toneClasses[badge.tone] || toneClasses.slate}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}