import React, { useCallback, useMemo } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import VideoClipController from '@/components/attorneyView/VideoClipController.jsx';

export default function AttorneyCentralPreview({ proof, allProofs = [], juryState, witnessState, onUpdateJury, onUpdateWitness }) {
  const proofMap = useMemo(() => Object.fromEntries(allProofs.map((item) => [item.id, item])), [allProofs]);
  const assetProof = useMemo(() => {
    let current = proof;
    while (current) {
      if (current.video_url || current.file_url || current.dropbox_file_id || current.dropbox_path) return current;
      current = current.parent_proof_id ? proofMap[current.parent_proof_id] : null;
    }
    return proof;
  }, [proof, proofMap]);
  const { url, isLoading } = useResolvedProofAsset(proof);
  const { url: assetUrl, isLoading: isAssetLoading } = useResolvedProofAsset(assetProof);
  const parentProof = proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) : null;

  const handlePdfStateChange = useCallback((pdfSync) => {
    if (juryState && juryState.published_proof_id === proof?.id && !juryState.is_blank && onUpdateJury) {
      onUpdateJury({
        pdf_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
      });
    }

    if (witnessState && witnessState.published_proof_id === proof?.id && !witnessState.is_blank && onUpdateWitness) {
      onUpdateWitness({
        pdf_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
      });
    }
  }, [juryState, proof, onUpdateJury, witnessState, onUpdateWitness]);

  const handleVideoStateChange = useCallback((videoSync) => {
    if (juryState && juryState.published_proof_id === proof?.id && !juryState.is_blank && onUpdateJury) {
      onUpdateJury({
        video_time: videoSync.currentTime || 0,
        is_playing: !!videoSync.playing,
      });
    }

    if (witnessState && witnessState.published_proof_id === proof?.id && !witnessState.is_blank && onUpdateWitness) {
      onUpdateWitness({
        video_time: videoSync.currentTime || 0,
        is_playing: !!videoSync.playing,
      });
    }
  }, [juryState, proof, onUpdateJury, witnessState, onUpdateWitness]);

  if (!proof) {
    return (
      <div className="flex h-full items-center justify-center bg-stone-100">
        <div className="rounded-[2rem] border border-stone-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
            <FileText className="h-8 w-8 text-stone-400" />
          </div>
          <p className="mt-4 text-lg font-semibold text-stone-900">Select a proof</p>
          <p className="mt-2 text-sm text-stone-500">Use the drawers to pick a marked exhibit, deposition, or linked proof.</p>
        </div>
      </div>
    );
  }

  const externalUrl = assetUrl || url || assetProof?.video_url || assetProof?.file_url || proof.video_url || proof.file_url || parentProof?.video_url || parentProof?.file_url;
  const parentName = parentProof?.formal_name || parentProof?.name || '';

  return (
    <div className="relative h-full overflow-hidden bg-[#f5ecdf]">
      <div className="h-full overflow-hidden rounded-none bg-white">
        {proof.proof_child_type === 'ExtractClip' ? (
          <div className="attorney-central-extract-clip h-full">
            <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" onStateChange={handlePdfStateChange} />
          </div>
        ) : proof.proof_child_type === 'Extract' ? (
          <ExtractViewer proof={proof} mode="controller" onStateChange={handlePdfStateChange} />
        ) : proof.proof_child_type === 'VideoClip' ? (
          (isLoading || isAssetLoading) && !externalUrl ? (
            <div className="flex h-full items-center justify-center bg-stone-100"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>
          ) : externalUrl ? (
            <div className="h-full overflow-auto bg-stone-950 p-4">
              <VideoClipController videoUrl={externalUrl} segments={proof.video_clips || []} onStateChange={handleVideoStateChange} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">No video source available</div>
          )
        ) : proof.file_type === 'Video' ? (
          isLoading && !externalUrl ? (
            <div className="flex h-full items-center justify-center bg-stone-100"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>
          ) : (
            <VideoViewer proof={proof} allProofs={allProofs} mode="controller" onStateChange={handleVideoStateChange} />
          )
        ) : proof.file_type === 'Image' && externalUrl ? (
          <div className="flex h-full items-center justify-center bg-stone-100 p-6">
            <img src={externalUrl} alt={proof.name} className="max-h-full max-w-full rounded-3xl object-contain shadow-lg" />
          </div>
        ) : externalUrl ? (
          <PDFViewer fileUrl={externalUrl} mode="controller" onStateChange={handlePdfStateChange} highlights={proof.highlights || []} clippedPage={proof.clipped_page || null} />
        ) : (
          <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">No file attached</div>
        )}
      </div>

      {parentName ? (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-stone-300 bg-white/95 px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm">
          Parent: {parentName}
        </div>
      ) : null}

      <style>{`
        .attorney-central-extract-clip > div > div:first-child {
          display: none;
        }
        .attorney-central-extract-clip > div > div:last-child {
          height: 100%;
        }
      `}</style>
    </div>
  );
}