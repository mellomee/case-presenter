import React, { useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import VideoClipController from '@/components/attorneyView/VideoClipController.jsx';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import StageProofHeader from '@/components/attorneyCentral/StageProofHeader.jsx';
import StageEmptyState from '@/components/attorneyCentral/StageEmptyState.jsx';

export default function AttorneyCentralStage({ proof, allProofs = [], juryState, witnessState, onUpdateJury, onUpdateWitness }) {
  const { url, isLoading } = useResolvedProofAsset(proof);
  const parentProof = proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) : null;
  const { url: parentUrl } = useResolvedProofAsset(parentProof);

  const handlePdfStateChange = useCallback((pdfSync) => {
    if (juryState?.published_proof_id === proof?.id && !juryState?.is_blank) {
      onUpdateJury?.({
        pdf_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
      });
    }

    if (witnessState?.published_proof_id === proof?.id && !witnessState?.is_blank) {
      onUpdateWitness?.({
        pdf_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
      });
    }
  }, [juryState, proof?.id, onUpdateJury, witnessState, onUpdateWitness]);

  const handleVideoStateChange = useCallback((videoSync) => {
    if (juryState?.published_proof_id === proof?.id && !juryState?.is_blank) {
      onUpdateJury?.({ video_time: videoSync.currentTime || 0, is_playing: !!videoSync.playing });
    }
    if (witnessState?.published_proof_id === proof?.id && !witnessState?.is_blank) {
      onUpdateWitness?.({ video_time: videoSync.currentTime || 0, is_playing: !!videoSync.playing });
    }
  }, [juryState, proof?.id, onUpdateJury, witnessState, onUpdateWitness]);

  if (!proof) return <StageEmptyState />;

  const externalUrl = url || parentUrl || proof.video_url || proof.file_url || parentProof?.video_url || parentProof?.file_url;
  const resolvedVideoProof = {
    ...proof,
    file_url: proof.file_type === 'Video' ? '' : (url || proof.file_url),
    video_url: proof.file_type === 'Video' ? (url || proof.video_url || proof.file_url) : proof.video_url,
  };

  const renderPreview = () => {
    if (proof.proof_child_type === 'ExtractClip') {
      return <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" onStateChange={handlePdfStateChange} />;
    }

    if (proof.proof_child_type === 'Extract') {
      return <ExtractViewer proof={proof} mode="controller" onStateChange={handlePdfStateChange} />;
    }

    if (proof.proof_child_type === 'VideoClip') {
      if (isLoading && !externalUrl) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
      }
      return (
        <div className="h-full min-h-0 overflow-auto p-3">
          <VideoClipController videoUrl={externalUrl} segments={proof.video_clips || []} onStateChange={handleVideoStateChange} />
        </div>
      );
    }

    if (proof.file_type === 'Video') {
      if (isLoading && !resolvedVideoProof.video_url) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
      }
      return <VideoViewer proof={resolvedVideoProof} allProofs={allProofs} mode="controller" onStateChange={handleVideoStateChange} />;
    }

    if (proof.file_type === 'Image' && externalUrl) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <img src={externalUrl} alt={proof.name} className="max-h-full max-w-full rounded-2xl object-contain shadow-sm" />
        </div>
      );
    }

    if (externalUrl) {
      return <PDFViewer fileUrl={externalUrl} mode="controller" onStateChange={handlePdfStateChange} highlights={proof.highlights || []} clippedPage={proof.clipped_page || null} />;
    }

    return <StageEmptyState />;
  };

  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <StageProofHeader proof={proof} parentProof={parentProof} />
      <div className="h-full min-h-0 bg-slate-100 pt-32">{renderPreview()}</div>
    </div>
  );
}