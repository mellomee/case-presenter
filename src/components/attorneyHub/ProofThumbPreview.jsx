import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Film } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const SIZE_MAP = {
  sm: { outer: 'w-14 h-20', page: 56 },
  md: { outer: 'w-24 h-32', page: 92 },
  lg: { outer: 'w-32 h-40', page: 120 },
};

export default function ProofThumbPreview({ proof = null, groupLabel = '', size = 'md' }) {
  const { url } = useResolvedProofAsset(proof);
  const sizing = SIZE_MAP[size] || SIZE_MAP.md;

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
    return <img src={url} alt={proof.name} className={`${sizing.outer} rounded-lg border border-slate-700 object-cover bg-slate-900`} />;
  }

  if (proof.file_type === 'Video') {
    return (
      <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-900 flex flex-col items-center justify-center gap-2`}>
        <Film className="w-5 h-5 text-blue-400" />
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Video</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center`}>
        <FileText className="w-5 h-5 text-slate-500" />
      </div>
    );
  }

  return (
    <div className={`${sizing.outer} overflow-hidden rounded-lg border border-slate-700 bg-white`}>
      <Document file={url} loading={<div className="w-full h-full bg-slate-200 animate-pulse" />}>
        <Page pageNumber={1} width={sizing.page} renderTextLayer={false} renderAnnotationLayer={false} loading={<div className="w-full h-full bg-slate-200 animate-pulse" />} />
      </Document>
    </div>
  );
}