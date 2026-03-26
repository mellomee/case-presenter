import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import VideoClipViewer from '@/components/proofVault/VideoClipViewer.jsx';

export default function ProofStage({ proof, allProofs = [], syncState, onSyncStateChange }) {
  const { url, isLoading } = useResolvedProofAsset(proof);
  const resolvedVideoProof = proof ? {
    ...proof,
    file_url: proof.file_type === 'Video' ? '' : (url || proof.file_url),
    video_url: proof.file_type === 'Video' ? (url || proof.video_url || proof.file_url) : proof.video_url,
  } : null;

  if (!proof) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-zinc-800 bg-zinc-950/70">
        <div className="text-center text-zinc-400">
          <FileText className="mx-auto h-10 w-10" />
          <p className="mt-4 text-lg font-medium text-zinc-200">Choose a proof to preview</p>
          <p className="mt-1 text-sm text-zinc-500">Your selected proof stays centered here for quick glances.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-zinc-800 bg-zinc-950/70">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!url && !proof.file_url && !proof.video_url) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-zinc-700 bg-zinc-950/70 p-8">
        <div className="max-w-xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Demo Preview</p>
          <h3 className="mt-4 text-3xl font-semibold text-white">{proof.formal_name || proof.name}</h3>
          <p className="mt-3 text-sm leading-7 text-zinc-400">This is a styled preview placeholder so you can evaluate the new Attorney Central layout even before real proof files are attached.</p>
        </div>
      </div>
    );
  }

  if (proof.proof_child_type === 'ExtractClip') {
    return <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" syncState={syncState} onStateChange={onSyncStateChange} />;
  }

  if (proof.proof_child_type === 'Extract') {
    return <ExtractViewer proof={proof} mode="controller" syncState={syncState} onStateChange={onSyncStateChange} />;
  }

  if (proof.proof_child_type === 'VideoClip') {
    return (
      <div className="h-full overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-3">
        <VideoClipViewer videoUrl={url || proof.video_url || proof.file_url} segments={proof.video_clips || []} />
      </div>
    );
  }

  if (proof.file_type === 'Video') {
    return <VideoViewer proof={resolvedVideoProof} allProofs={allProofs} mode="controller" syncState={syncState} onStateChange={onSyncStateChange} />;
  }

  if (proof.file_type === 'Image' && (url || proof.file_url)) {
    return (
      <div className="flex h-full items-center justify-center overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-6">
        <img src={url || proof.file_url} alt={proof.name} className="max-h-full max-w-full rounded-2xl object-contain" />
      </div>
    );
  }

  return <PDFViewer fileUrl={url || proof.file_url} mode="controller" syncState={syncState} onStateChange={onSyncStateChange} />;
}