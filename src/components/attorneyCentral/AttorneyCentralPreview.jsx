import React, { useCallback, useEffect } from 'react';
import { FileText, Highlighter, Loader2 } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import VideoClipController from '@/components/attorneyView/VideoClipController.jsx';
import AttorneyCentralMarkupLayer from '@/components/attorneyCentral/AttorneyCentralMarkupLayer.jsx';
import AttorneyCentralMarkupToolbar from '@/components/attorneyCentral/AttorneyCentralMarkupToolbar.jsx';

export default function AttorneyCentralPreview({
  proof,
  allProofs = [],
  juryState,
  witnessState,
  onUpdateJury,
  onUpdateWitness,
  markupMode,
  markupTool,
  liveMarkup,
  onToggleMarkupMode,
  onMarkupToolChange,
  onUndoMarkup,
  onClearMarkup,
  onAddMarkupStroke,
  onAddMarkupHighlight,
}) {
  const { url, isLoading } = useResolvedProofAsset(proof);
  const parentProof = proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) : null;
  const { url: parentUrl, isLoading: isParentLoading } = useResolvedProofAsset(parentProof);

  const handlePdfStateChange = useCallback((pdfSync) => {
    const liveMarkupPayload = markupMode ? {
      currentPage: pdfSync.currentPage,
      strokes: liveMarkup?.strokes || [],
      highlights: liveMarkup?.highlights || [],
    } : { currentPage: null, strokes: [], highlights: [] };

    if (juryState && juryState.published_proof_id === proof?.id && !juryState.is_blank && onUpdateJury) {
      onUpdateJury({
        pdf_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
        live_markup: liveMarkupPayload,
      });
    }

    if (witnessState && witnessState.published_proof_id === proof?.id && !witnessState.is_blank && onUpdateWitness) {
      onUpdateWitness({
        pdf_page: pdfSync.currentPage,
        ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
        ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
        ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
        live_markup: liveMarkupPayload,
      });
    }
  }, [juryState, proof, onUpdateJury, witnessState, onUpdateWitness, markupMode, liveMarkup]);

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
  const isPdfMarkupTarget = Boolean(proof && (proof.file_type === 'PDF' || proof.proof_child_type === 'Extract' || proof.proof_child_type === 'ExtractClip'));
  const canShowMarkupControls = isPdfMarkupTarget;
  const canUndoMarkup = (liveMarkup?.strokes?.length || 0) > 0 || (liveMarkup?.highlights?.length || 0) > 0;

  React.useEffect(() => {
    if (!proof || !isPdfMarkupTarget) return;

    const liveMarkupPayload = markupMode
      ? { currentPage: (juryState?.pdf_page || witnessState?.pdf_page || 1), strokes: liveMarkup?.strokes || [], highlights: liveMarkup?.highlights || [] }
      : { currentPage: null, strokes: [], highlights: [] };

    if (juryState && juryState.published_proof_id === proof.id && !juryState.is_blank && onUpdateJury) {
      onUpdateJury({ live_markup: liveMarkupPayload });
    }

    if (witnessState && witnessState.published_proof_id === proof.id && !witnessState.is_blank && onUpdateWitness) {
      onUpdateWitness({ live_markup: liveMarkupPayload });
    }
  }, [proof?.id, isPdfMarkupTarget, markupMode, liveMarkup, juryState?.published_proof_id, juryState?.is_blank, juryState?.pdf_page, witnessState?.published_proof_id, witnessState?.is_blank, witnessState?.pdf_page, onUpdateJury, onUpdateWitness]);

  const overlayMarkup = markupMode && isPdfMarkupTarget ? (
    <AttorneyCentralMarkupLayer
      enabled={markupMode}
      tool={markupTool}
      strokes={liveMarkup?.strokes || []}
      highlights={liveMarkup?.highlights || []}
      onAddStroke={onAddMarkupStroke}
      onAddHighlight={onAddMarkupHighlight}
    />
  ) : null;

  return (
    <div className="relative h-full overflow-hidden bg-[#f5ecdf]">
      <div className="h-full overflow-hidden rounded-none bg-white">
        {proof.proof_child_type === 'ExtractClip' && proof?.witness_markup ? (
          <PDFViewer fileUrl={externalUrl} mode="controller" onStateChange={handlePdfStateChange} />
        ) : proof.proof_child_type === 'ExtractClip' ? (
          <div className="attorney-central-extract-clip h-full">
            <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" onStateChange={handlePdfStateChange} />
          </div>
        ) : proof.proof_child_type === 'Extract' ? (
          <PDFViewer fileUrl={externalUrl || proof.file_url} mode="controller" onStateChange={handlePdfStateChange} allowPan={!markupMode || markupTool === 'pan'} pageOverlay={overlayMarkup} />
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
          <PDFViewer fileUrl={externalUrl} mode="controller" onStateChange={handlePdfStateChange} highlights={proof.highlights || []} clippedPage={proof.clipped_page || null} allowPan={!markupMode || markupTool === 'pan'} pageOverlay={overlayMarkup} />
        ) : (
          <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">No file attached</div>
        )}
      </div>

      {canShowMarkupControls ? (
        <>
          <button
            type="button"
            onClick={onToggleMarkupMode}
            className={`absolute right-4 top-4 z-20 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-lg transition ${markupMode ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white/95 text-stone-800 backdrop-blur-sm'}`}
          >
            <Highlighter className="h-4 w-4" />
            {markupMode ? 'Exit Markup' : 'Markup'}
          </button>
          <AttorneyCentralMarkupToolbar
            open={markupMode}
            tool={markupTool}
            onToolChange={onMarkupToolChange}
            onUndo={onUndoMarkup}
            onClear={onClearMarkup}
            canUndo={canUndoMarkup}
          />
        </>
      ) : null}

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