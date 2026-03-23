import React from 'react';
import { FileText, Film, Image as ImageIcon, Layers3 } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

const SIZE_MAP = {
  sm: { outer: 'w-14 h-20', text: 'text-[10px]' },
  md: { outer: 'w-24 h-32', text: 'text-xs' },
  lg: { outer: 'w-32 h-40', text: 'text-sm' },
};

function getStatusBadge(proof) {
  if (proof?.status === 'Admitted') return { label: 'Admitted', className: 'bg-green-600/90 text-white' };
  if (proof?.status === 'Demonstrative') return { label: 'Demo', className: 'bg-purple-600/90 text-white' };
  if (proof?.status === 'Joint') return { label: 'Joint', className: 'bg-blue-600/90 text-white' };
  return null;
}

export default function ExamBuilderProofThumb({ proof = null, groupLabel = '', size = 'md', theme = 'dark' }) {
  const { url } = useResolvedProofAsset(proof);
  const sizing = SIZE_MAP[size] || SIZE_MAP.md;
  const statusBadge = getStatusBadge(proof);
  const isLightTheme = theme === 'light';
  const frameClass = isLightTheme ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-900';
  const iconClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';
  const labelClass = isLightTheme ? 'text-slate-700' : 'text-slate-300';
  const childBadge = proof?.parent_proof_id ? { label: proof?.proof_child_type || 'Child', className: isLightTheme ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-900/90 text-white' } : null;

  if (groupLabel) {
    return <div className={`${sizing.outer} rounded-lg border ${frameClass} flex items-center justify-center p-3 text-center`}><div><Layers3 className={`mx-auto h-5 w-5 ${iconClass}`} /><span className={`mt-2 block font-semibold ${labelClass} ${sizing.text}`}>{groupLabel}</span></div></div>;
  }

  if (!proof) {
    return <div className={`${sizing.outer} rounded-lg border ${frameClass} flex items-center justify-center`}><FileText className={`h-5 w-5 ${iconClass}`} /></div>;
  }

  if (proof.file_type === 'Image' && url) {
    return (
      <div className="relative">
        <img src={url} alt={proof.name || 'Proof'} className={`${sizing.outer} rounded-lg border ${frameClass} object-cover`} />
        <div className="absolute bottom-1 left-1 flex flex-col items-start gap-1">
          {statusBadge && <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none ${statusBadge.className}`}>{statusBadge.label}</span>}
          {childBadge && <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none ${childBadge.className}`}>{childBadge.label}</span>}
        </div>
      </div>
    );
  }

  const Icon = proof.file_type === 'Video' ? Film : proof.file_type === 'Image' ? ImageIcon : FileText;
  const label = proof.proof_child_type || proof.file_type || 'Proof';

  return (
    <div className={`relative ${sizing.outer} rounded-lg border ${frameClass} flex items-center justify-center p-3 text-center`}>
      <div>
        <Icon className={`mx-auto h-5 w-5 ${iconClass}`} />
        <span className={`mt-2 block font-semibold ${labelClass} ${sizing.text}`}>{label}</span>
      </div>
      <div className="absolute bottom-1 left-1 flex flex-col items-start gap-1">
        {statusBadge && <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none ${statusBadge.className}`}>{statusBadge.label}</span>}
        {childBadge && <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none ${childBadge.className}`}>{childBadge.label}</span>}
      </div>
    </div>
  );
}