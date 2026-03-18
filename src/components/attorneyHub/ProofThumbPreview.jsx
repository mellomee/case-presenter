import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import { CheckCircle2, FileText, Film } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const SIZE_MAP = {
  sm: { outer: 'w-14 h-20', page: 56 },
  md: { outer: 'w-24 h-32', page: 92 },
  lg: { outer: 'w-32 h-40', page: 120 },
};

export default function ProofThumbPreview({ proof = null, groupLabel = '', size = 'md' }) {
  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
    enabled: !!proof?.parent_proof_id,
  });
  const { url } = useResolvedProofAsset(proof);
  const sizing = SIZE_MAP[size] || SIZE_MAP.md;
  const parentProof = useMemo(
    () => proofs.find((item) => item.id === proof?.parent_proof_id) || null,
    [proof?.parent_proof_id, proofs]
  );
  const effectiveStatus = proof?.status === 'Admitted' || proof?.status === 'Demonstrative'
    ? proof.status
    : (parentProof?.status === 'Admitted' || parentProof?.status === 'Demonstrative' ? parentProof.status : null);

  if (groupLabel) {
    return (
      <div className={`${sizing.outer} rounded-lg border border-slate-300 bg-white flex items-center justify-center p-3 text-center`}>
        <span className="text-xs font-semibold text-slate-700 leading-tight">{groupLabel}</span>
      </div>
    );
  }

  if (!proof) {
    return (
      <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center`}>
        <FileText className="w-5 h-5 text-slate-500" />
      </div>
    );
  }

  if (proof.file_type === 'Image' && url) {
    return (
      <div className="relative">
        <img src={url} alt={proof.name} className={`${sizing.outer} rounded-lg border border-slate-700 object-cover bg-slate-900`} />
        {effectiveStatus && (
          <CheckCircle2 className={`absolute right-1 top-1 w-4 h-4 ${effectiveStatus === 'Demonstrative' ? 'text-blue-400' : 'text-red-400'}`} />
        )}
      </div>
    );
  }

  if (proof.file_type === 'Video') {
    return (
      <div className="relative">
        <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-900 flex flex-col items-center justify-center gap-2`}>
          <Film className="w-5 h-5 text-blue-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Video</span>
        </div>
        {effectiveStatus && (
          <CheckCircle2 className={`absolute right-1 top-1 w-4 h-4 ${effectiveStatus === 'Demonstrative' ? 'text-blue-400' : 'text-red-400'}`} />
        )}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="relative">
        <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center`}>
          <FileText className="w-5 h-5 text-slate-500" />
        </div>
        {effectiveStatus && (
          <CheckCircle2 className={`absolute right-1 top-1 w-4 h-4 ${effectiveStatus === 'Demonstrative' ? 'text-blue-400' : 'text-red-400'}`} />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`${sizing.outer} overflow-hidden rounded-lg border border-slate-700 bg-white`}>
      <Document file={url} loading={<div className="w-full h-full bg-slate-200 animate-pulse" />}>
        <Page pageNumber={1} width={sizing.page} renderTextLayer={false} renderAnnotationLayer={false} loading={<div className="w-full h-full bg-slate-200 animate-pulse" />} />
      </Document>
    </div>
  );
}