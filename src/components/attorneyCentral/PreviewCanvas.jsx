import React from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

export default function PreviewCanvas({ proof, allProofs }) {
  const { url, isLoading } = useResolvedProofAsset(proof);

  if (!proof) {
    return (
      <div className="flex h-full items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-xl">
        <div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">Select a proof</h2>
          <p className="mt-2 text-sm text-slate-500">Large proof tiles stay on the left so the attorney can glance, tap once, and keep moving.</p>
        </div>
      </div>
    );
  }

  const externalUrl = url || proof.video_url || proof.file_url;
  const resolvedVideoProof = {
    ...proof,
    file_url: proof.file_type === 'Video' ? '' : (url || proof.file_url),
    video_url: proof.file_type === 'Video' ? (url || proof.video_url || proof.file_url) : proof.video_url,
  };

  const renderPreview = () => {
    if (proof.proof_child_type === 'ExtractClip') {
      return <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" />;
    }

    if (proof.proof_child_type === 'Extract') {
      return <ExtractViewer proof={proof} mode="controller" />;
    }

    if (proof.proof_child_type === 'VideoClip' || proof.file_type === 'Video') {
      return <VideoViewer proof={resolvedVideoProof} allProofs={allProofs} mode="controller" />;
    }

    if (proof.file_type === 'Image') {
      if (isLoading && !externalUrl) {
        return (
          <div className="flex h-full items-center justify-center bg-slate-100">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        );
      }

      return (
        <div className="flex h-full items-center justify-center bg-slate-100 p-4">
          <img src={externalUrl} alt={proof.name} className="max-h-full max-w-full rounded-[24px] object-contain shadow-lg" />
        </div>
      );
    }

    if (externalUrl) {
      return <PDFViewer fileUrl={externalUrl} mode="controller" />;
    }

    return (
      <div className="flex h-full items-center justify-center bg-slate-100 text-slate-500">
        No file attached
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Live proof preview</p>
          <p className="mt-1 text-sm font-medium text-slate-600">Built to stay big, centered, and easy to tap on tablets.</p>
        </div>
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Open file
          </a>
        )}
      </div>
      <div className="min-h-0 flex-1 bg-slate-100">{renderPreview()}</div>
    </div>
  );
}