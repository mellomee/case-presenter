import React, { useCallback } from 'react';
import AttorneyCentralLiveMarkupOverlay from '@/components/attorneyCentral/AttorneyCentralLiveMarkupOverlay.jsx';
import { FileText, Loader2 } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import VideoClipController from '@/components/attorneyView/VideoClipController.jsx';

export default function AttorneyCentralPreview({ proof, allProofs = [], juryState, witnessState, onUpdateJury, onUpdateWitness, markupMode = 'navigate' }) {
  const { url, isLoading } = useResolvedProofAsset(proof);
  const parentProof = proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) : null;
  const { url: parentUrl, isLoading: isParentLoading } = useResolvedProofAsset(parentProof);

  const handlePdfStateChange = useCallback((pdfSync) => {
    if (juryState && juryState.published_proof_id === proof?.id && !juryState.is_blank && onUpdateJury) {
      onUpdateJury({
        pdf_page: pdfSync.currentPage,
        live_markup_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
      });
    }

    if (witnessState && witnessState.published_proof_id === proof?.id && !witnessState.is_blank && onUpdateWitness) {
      onUpdateWitness({
        pdf_page: pdfSync.currentPage,
        live_markup_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
      });
    }
  }, [juryState, proof, onUpdateJury, witnessState, onUpdateWitness]);

  const handleLiveMarkupChange = useCallback((markup) => {
    const activePage = juryState?.published_proof_id === proof?.id && !juryState?.is_blank
      ? (juryState?.pdf_page || 1)
      : witnessState?.published_proof_id === proof?.id && !witnessState?.is_blank
        ? (witnessState?.pdf_page || 1)
        : 1;

    if (juryState && juryState.published_proof_id === proof?.id && !juryState.is_blank && onUpdateJury) {
      onUpdateJury({
        live_markup_mode: markupMode,
        live_markup_page: activePage,
        live_markup_strokes: markup.strokes,
        live_markup_highlights: markup.highlights,
      });
    }

    if (witnessState && witnessState.published_proof_id === proof?.id && !witnessState.is_blank && onUpdateWitness) {
      onUpdateWitness({
        live_markup_mode: markupMode,
        live_markup_page: activePage,
        live_markup_strokes: markup.strokes,
        live_markup_highlights: markup.highlights,
      });
    }
  }, [juryState, witnessState, proof, onUpdateJury, onUpdateWitness, markupMode]);

  const liveMarkupOverlay = (proof?.file_type === 'PDF' || proof?.proof_child_type === 'Extract') ? (
    <AttorneyCentralLiveMarkupOverlay
      mode={markupMode}
      strokes={[
        ...((juryState?.published_proof_id === proof?.id && !juryState?.is_blank ? juryState?.live_markup_strokes : null) || []),
        ...((witnessState?.published_proof_id === proof?.id && !witnessState?.is_blank ? witnessState?.live_markup_strokes : null) || []),
      ].slice(0, juryState?.published_proof_id === proof?.id && !juryState?.is_blank ? (juryState?.live_markup_strokes || []).length : (witnessState?.live_markup_strokes || []).length)}
      highlights={[
        ...((juryState?.published_proof_id === proof?.id && !juryState?.is_blank ? juryState?.live_markup_highlights : null) || []),
        ...((witnessState?.published_proof_id === proof?.id && !witnessState?.is_blank ? witnessState?.live_markup_highlights : null) || []),
      ].slice(0, juryState?.published_proof_id === proof?.id && !juryState?.is_blank ? (juryState?.live_markup_highlights || []).length : (witnessState?.live_markup_highlights || []).length)}
      onChange={handleLiveMarkupChange}
    />
  ) : null;

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

  const externalUrl = url || parentUrl || proof.video_url || proof.file_url || parentProof?.video_url || parentProof?.file_url;
  const parentName = parentProof?.name || parentProof?.formal_name || '';
  const isVideoClipLoading = (isLoading || isParentLoading) && !externalUrl;

  return (
    <div className="relative h-full overflow-hidden bg-[#f5ecdf]">
      <div className="h-full overflow-hidden rounded-none bg-white">
        {proof.proof_child_type === 'ExtractClip' && proof?.witness_markup ? (
          <PDFViewer fileUrl={externalUrl} mode="controller" onStateChange={handlePdfStateChange} pageOverlay={liveMarkupOverlay} overlayClassName="absolute inset-0" />
        ) : proof.proof_child_type === 'ExtractClip' ? (
          <div className="h-full">
            <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" onStateChange={handlePdfStateChange} hideHeader />
          </div>
        ) : proof.proof_child_type === 'Extract' ? (
          <ExtractViewer proof={proof} mode="controller" onStateChange={handlePdfStateChange} pageOverlay={liveMarkupOverlay} />
        ) : proof.proof_child_type === 'VideoClip' ? (
          isVideoClipLoading ? (
            <div className="flex h-full items-center justify-center bg-stone-100"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>
          ) : (
            <div className="h-full overflow-auto bg-stone-950 p-4">
              <VideoClipController videoUrl={externalUrl} segments={proof.video_clips || []} onStateChange={handleVideoStateChange} />
            </div>
          )
        ) : proof.file_type === 'Video' ? (
          isLoading && !externalUrl ? (
            <div className="flex h-full items-center justify-center bg-stone-100"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>
          ) : (
            <VideoViewer proof={{ ...proof, video_url: externalUrl || proof.video_url, file_url: externalUrl || proof.file_url }} allProofs={allProofs} mode="controller" onStateChange={handleVideoStateChange} />
          )
        ) : proof.file_type === 'Image' && externalUrl ? (
          <div className="flex h-full items-center justify-center bg-stone-100 p-6">
            <img src={externalUrl} alt={proof.name} className="max-h-full max-w-full rounded-3xl object-contain shadow-lg" />
          </div>
        ) : externalUrl ? (
          <PDFViewer fileUrl={externalUrl} mode="controller" onStateChange={handlePdfStateChange} highlights={proof.highlights || []} clippedPage={proof.clipped_page || null} pageOverlay={liveMarkupOverlay} overlayClassName="absolute inset-0" />
        ) : (
          <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">No file attached</div>
        )}
      </div>

      {parentName ? (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-stone-300 bg-white/95 px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm">
          Parent: {parentName}
        </div>
      ) : null}

    </div>
  );
}