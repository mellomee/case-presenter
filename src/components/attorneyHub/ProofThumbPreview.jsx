import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import { CheckCircle2, FileText, Film, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import PdfThumbErrorBoundary from '@/components/attorneyHub/PdfThumbErrorBoundary.jsx';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const SIZE_MAP = {
  sm: { outer: 'w-14 h-20', page: 56 },
  md: { outer: 'w-24 h-32', page: 92 },
  lg: { outer: 'w-32 h-40', page: 120 },
};

const BADGE_TEXT_SIZE = {
  sm: 'text-[8px]',
  md: 'text-[9px]',
  lg: 'text-[10px]',
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
  const jointNumber = proof?.joint_exhibit_num || parentProof?.joint_exhibit_num;
  const admittedNumber = proof?.admitted_exhibit_num || parentProof?.admitted_exhibit_num;
  const demoNumber = proof?.demonstrative_exhibit_num || parentProof?.demonstrative_exhibit_num;
  const badgeTextSize = BADGE_TEXT_SIZE[size] || BADGE_TEXT_SIZE.md;
  const statusLabel = effectiveStatus === 'Demonstrative' ? 'Demonstrative' : effectiveStatus === 'Admitted' ? 'Admitted' : null;

  const statusIcon = effectiveStatus ? (
    <CheckCircle2
      className={`absolute right-1 top-1 w-4 h-4 ${effectiveStatus === 'Demonstrative' ? 'text-blue-400' : 'text-red-400'}`}
    />
  ) : (
    <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70">
      <X className="h-3 w-3 text-slate-300" />
    </div>
  );

  const overlayBadges = [
    jointNumber ? { label: `Joint # ${jointNumber}`, className: 'bg-blue-600/90 text-white' } : null,
    admittedNumber ? { label: `Admitted # ${admittedNumber}`, className: 'bg-green-600/90 text-white' } : null,
    demoNumber ? { label: `Demo # ${demoNumber}`, className: 'bg-purple-600/90 text-white' } : null,
  ].filter(Boolean);

  const numberBadges = overlayBadges.length > 0 ? (
    <div className="absolute bottom-1 left-1 flex max-w-[calc(100%-0.5rem)] flex-col items-start gap-1">
      {overlayBadges.map((badge) => (
        <div
          key={badge.label}
          className={`max-w-full truncate rounded px-1.5 py-0.5 font-semibold leading-none shadow-sm backdrop-blur ${badgeTextSize} ${badge.className}`}
        >
          {badge.label}
        </div>
      ))}
    </div>
  ) : null;

  const statusLabelBadge = statusLabel ? (
    <div className={`absolute left-1 top-1 rounded px-1.5 py-0.5 font-semibold leading-none shadow-sm ${badgeTextSize} ${effectiveStatus === 'Demonstrative' ? 'bg-purple-600/90 text-white' : 'bg-green-600/90 text-white'}`}>
      {statusLabel}
    </div>
  ) : null;

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
        {statusIcon}
        {statusLabelBadge}
        {numberBadges}
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
        {statusIcon}
        {statusLabelBadge}
        {numberBadges}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="relative">
        <div className={`${sizing.outer} rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center`}>
          <FileText className="w-5 h-5 text-slate-500" />
        </div>
        {statusIcon}
        {statusLabelBadge}
        {numberBadges}
      </div>
    );
  }

  return (
    <div className="relative">
      <PdfThumbErrorBoundary resetKey={url} className={`${sizing.outer} overflow-hidden rounded-lg border border-slate-700 bg-white`}>
        <Document
          key={url}
          file={url}
          loading={<div className="w-full h-full bg-slate-200 animate-pulse" />}
          error={<div className="flex h-full w-full items-center justify-center bg-slate-100"><FileText className="h-5 w-5 text-slate-400" /></div>}
        >
          <Page
            pageNumber={1}
            width={sizing.page}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={<div className="w-full h-full bg-slate-200 animate-pulse" />}
          />
        </Document>
      </PdfThumbErrorBoundary>
      {statusIcon}
      {numberBadges}
    </div>
  );
}