import React from 'react';
import { FileText, Film, Image as ImageIcon, Layers3 } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

const SIZE_MAP = {
  sm: { outer: 'w-14 h-20', text: 'text-[10px]' },
  md: { outer: 'w-24 h-32', text: 'text-xs' },
  lg: { outer: 'w-32 h-40', text: 'text-sm' },
};

export default function ExamBuilderProofThumb({ proof = null, groupLabel = '', size = 'md' }) {
  const { url } = useResolvedProofAsset(proof);
  const sizing = SIZE_MAP[size] || SIZE_MAP.md;

  if (groupLabel) {
    return <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center p-3 text-center`}><div><Layers3 className="mx-auto h-5 w-5 text-slate-500" /><span className={`mt-2 block font-semibold text-slate-300 ${sizing.text}`}>{groupLabel}</span></div></div>;
  }

  if (!proof) {
    return <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center`}><FileText className="h-5 w-5 text-slate-500" /></div>;
  }

  if (proof.file_type === 'Image' && url) {
    return <img src={url} alt={proof.name || 'Proof'} className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-900 object-cover`} />;
  }

  const Icon = proof.file_type === 'Video' ? Film : proof.file_type === 'Image' ? ImageIcon : FileText;
  const label = proof.proof_child_type || proof.file_type || 'Proof';

  return <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center p-3 text-center`}><div><Icon className="mx-auto h-5 w-5 text-slate-400" /><span className={`mt-2 block font-semibold text-slate-300 ${sizing.text}`}>{label}</span></div></div>;
}