import React from 'react';
import ReactPlayer from 'react-player';
import { Document, Page, pdfjs } from 'react-pdf';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { getProofDisplayName } from '@/lib/examV2Utils';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function InlineProofPreviewDialog({ open, onOpenChange, proof }) {
  const { url } = useResolvedProofAsset(proof);

  const renderPreview = () => {
    if (!proof) return null;

    if (proof.file_type === 'Video') {
      return (
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video">
          <ReactPlayer url={url || proof.video_url} width="100%" height="100%" controls />
        </div>
      );
    }

    if (proof.file_type === 'Image' && url) {
      return (
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center p-4">
          <img src={url} alt={getProofDisplayName(proof)} className="max-h-[70vh] max-w-full object-contain rounded" />
        </div>
      );
    }

    if (url) {
      return (
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 p-4 flex justify-center">
          <Document file={url} loading={<div className="h-80 w-full animate-pulse bg-slate-800 rounded-lg" />}>
            <Page pageNumber={proof.clipped_page || 1} width={760} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        </div>
      );
    }

    return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-sm text-slate-400">No preview available.</div>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-slate-950 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getProofDisplayName(proof)}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {proof?.proof_child_type || proof?.file_type || 'Proof'} preview
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            {proof?.joint_exhibit_num && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">Joint #{proof.joint_exhibit_num}</span>}
            {proof?.proof_child_type && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">{proof.proof_child_type}</span>}
            {proof?.clipped_page && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">Page {proof.clipped_page}</span>}
            {Array.isArray(proof?.video_clips) && proof.video_clips.length > 0 && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">{proof.video_clips.length} segment{proof.video_clips.length === 1 ? '' : 's'}</span>}
          </div>
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}