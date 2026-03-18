import React from 'react';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import VideoClipViewer from '@/components/proofVault/VideoClipViewer.jsx';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function InlineProofPreviewPane({ proof, allProofs = [] }) {
  const { url } = useResolvedProofAsset(proof);
  const parentProof = proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) : null;
  const parentUrl = parentProof?.video_url || parentProof?.file_url || '';

  if (!proof) {
    return (
      <div className="h-full rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-slate-300">Preview</p>
          <p className="mt-2 text-sm text-slate-500">Click the eye icon on any inline proof thumbnail to preview it here.</p>
        </div>
      </div>
    );
  }

  const renderPreview = () => {
    if (proof.proof_child_type === 'ExtractClip') {
      return <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" />;
    }

    if (proof.proof_child_type === 'Extract') {
      return <ExtractViewer proof={proof} mode="controller" />;
    }

    if (proof.proof_child_type === 'VideoClip') {
      return <VideoClipViewer videoUrl={url || parentUrl || proof.video_url || proof.file_url} segments={proof.video_clips || []} />;
    }

    if (proof.file_type === 'Video') {
      return <VideoViewer proof={proof} allProofs={allProofs} mode="controller" />;
    }

    if (proof.file_type === 'Image' && url) {
      return (
        <div className="h-full rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-4">
          <img src={url} alt={getProofDisplayName(proof)} className="max-h-full max-w-full object-contain rounded" />
        </div>
      );
    }

    if (url) {
      return <PDFViewer fileUrl={url} mode="controller" highlights={proof.highlights || []} clippedPage={proof.clipped_page || null} />;
    }

    return <div className="h-full rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center text-sm text-slate-500">No preview available.</div>;
  };

  return (
    <div className="h-full min-h-[24rem] rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inline Proof Preview</p>
        <p className="mt-1 text-sm font-semibold text-white truncate">{getProofDisplayName(proof)}</p>
      </div>
      <div className="flex-1 min-h-0 bg-slate-950">
        {renderPreview()}
      </div>
    </div>
  );
}