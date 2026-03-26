import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Film, Image as ImageIcon, Loader2, Scissors, Clapperboard } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function AttorneyCentralProofThumb({ proof, className = '' }) {
  const { url, isLoading } = useResolvedProofAsset(proof);
  const resolvedUrl = url || proof?.video_url || proof?.file_url;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-stone-100 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (proof?.proof_child_type === 'VideoClip') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-stone-900 ${className}`}>
        <div className="flex h-full w-full items-center justify-center text-white">
          <Clapperboard className="h-8 w-8 opacity-80" />
        </div>
        <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-stone-900">Clip</div>
      </div>
    );
  }

  if (proof?.file_type === 'Video') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-stone-900 ${className}`}>
        {resolvedUrl ? (
          <video src={resolvedUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white"><Film className="h-8 w-8 opacity-80" /></div>
        )}
        <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-stone-900">Video</div>
      </div>
    );
  }

  if (proof?.file_type === 'Image' && resolvedUrl) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-stone-100 ${className}`}>
        <img src={resolvedUrl} alt={proof?.name || 'Proof'} className="h-full w-full object-cover" />
        <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-stone-900">Image</div>
      </div>
    );
  }

  if (resolvedUrl) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-white ${className}`}>
        <Document file={resolvedUrl} loading={null} error={null} className="h-full w-full">
          <Page pageNumber={1} width={160} renderTextLayer={false} renderAnnotationLayer={false} loading={null} />
        </Document>
        <div className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-stone-900 shadow-sm">PDF</div>
        {proof?.proof_child_type === 'Extract' ? <div className="absolute right-2 top-2 rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-800">Extract</div> : null}
        {proof?.proof_child_type === 'ExtractClip' ? <div className="absolute right-2 top-2 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-800"><Scissors className="mr-1 inline h-3 w-3" />Clip</div> : null}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl bg-stone-100 text-stone-400 ${className}`}>
      {proof?.file_type === 'Image' ? <ImageIcon className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
    </div>
  );
}