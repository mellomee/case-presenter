import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import PDFViewer from '@/components/proofVault/PDFViewer';
import { parsePageRange } from '@/components/proofVault/pageRangeUtils';
import { getInitialHighlightPage } from '@/components/proofVault/highlightGroupUtils';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { Scale, Maximize } from 'lucide-react';
import JurySyncedVideoPlayer from '@/components/juryView/JurySyncedVideoPlayer.jsx';
import JurySyncedVideoClipPlayer from '@/components/juryView/JurySyncedVideoClipPlayer.jsx';

function TopRightBadges({ proof, demoLabel }) {
  const isDemo = proof.status === 'Demonstrative';
  const exhibitNum = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num;

  return (
    <div className="absolute top-4 right-5 flex flex-col items-end gap-2 pointer-events-none z-20">
      {exhibitNum && (
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-bold px-3 py-1.5 rounded-lg tracking-wide shadow-lg">
          {isDemo ? 'Demo' : 'Exhibit'} {exhibitNum}
        </div>
      )}
      {isDemo && (
        <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 text-amber-300 text-xs italic px-3 py-1.5 rounded-lg shadow-lg max-w-xs text-right">
          {demoLabel}
        </div>
      )}
    </div>
  );
}

function FullscreenButton({ onClick, visible }) {
  return (
    <button
      onClick={onClick}
      className={`absolute bottom-4 right-4 z-30 bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 p-2.5 rounded-lg transition-all ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      title="Enter fullscreen"
    >
      <Maximize className="w-4 h-4" />
    </button>
  );
}

function BlankScreen({ caseName, onEnterFullscreen, isFullscreen }) {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-black group">
      <div className="text-center select-none">
        <Scale className="mx-auto mb-6 h-[200px] w-[200px] text-white/25" strokeWidth={1} />
        <p className="text-white/12 text-lg tracking-[0.3em] uppercase font-light">
          {caseName || 'Case Presenter'}
        </p>
      </div>
      <FullscreenButton onClick={onEnterFullscreen} visible={!isFullscreen} />
    </div>
  );
}

export default function JuryView() {
  const { juryState } = useJurySync('jury');
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  const { data: proof } = useQuery({
    queryKey: ['juryProof', juryState?.published_proof_id],
    queryFn: () => base44.entities.Proof.filter({ id: juryState.published_proof_id }).then((r) => r[0]),
    enabled: !!juryState?.published_proof_id && !juryState?.is_blank,
  });

  const { data: parentExtract } = useQuery({
    queryKey: ['juryParentExtract', proof?.parent_proof_id],
    queryFn: () => base44.entities.Proof.filter({ id: proof.parent_proof_id }).then((r) => r[0] || null),
    enabled: proof?.proof_child_type === 'ExtractClip' && !!proof?.parent_proof_id,
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list().then((r) => r[0] || {}),
  });

  const { url: resolvedAssetUrl, isLoading: isAssetLoading } = useResolvedProofAsset(proof);

  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    enterFullscreen();

    const tryFullscreenOnGesture = () => {
      enterFullscreen();
    };

    document.addEventListener('pointerdown', tryFullscreenOnGesture, { once: true });
    document.addEventListener('keydown', tryFullscreenOnGesture, { once: true });

    return () => {
      document.removeEventListener('pointerdown', tryFullscreenOnGesture);
      document.removeEventListener('keydown', tryFullscreenOnGesture);
    };
  }, [enterFullscreen]);

  const caseName = settings?.case_name || 'Case Presenter';
  const demoLabel = settings?.jury_demonstrative_label || 'For illustrative purposes only';
  const isBlank = !juryState || juryState.is_blank || !juryState.published_proof_id;
  const visiblePages = proof?.proof_child_type === 'Extract'
    ? parsePageRange(proof.extract_pages || '')
    : proof?.proof_child_type === 'ExtractClip'
      ? parsePageRange(parentExtract?.extract_pages || '')
      : null;
  const initialClipPage = proof?.proof_child_type === 'ExtractClip'
    ? getInitialHighlightPage(proof.highlights, proof.clipped_page || 1)
    : null;
  const isExtractClipLoading = proof?.proof_child_type === 'ExtractClip' && !!proof?.parent_proof_id && parentExtract === undefined;

  if (!juryState) {
    return (
      <div className="relative flex items-center justify-center w-full h-screen bg-black group">
        <Scale className="h-[200px] w-[200px] text-white/25" strokeWidth={1} />
        <FullscreenButton onClick={enterFullscreen} visible={!isFullscreen} />
      </div>
    );
  }

  if (isBlank) {
    return <BlankScreen caseName={caseName} onEnterFullscreen={enterFullscreen} isFullscreen={isFullscreen} />;
  }

  if (!proof || isAssetLoading || isExtractClipLoading) {
    return (
      <div className="relative flex items-center justify-center w-full h-screen bg-black group">
        <Scale className="h-[200px] w-[200px] text-white/25" strokeWidth={1} />
        <FullscreenButton onClick={enterFullscreen} visible={!isFullscreen} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-screen bg-black overflow-hidden group">
      <TopRightBadges proof={proof} demoLabel={demoLabel} />

      <div className="flex-1 overflow-hidden flex items-center justify-center">
        {proof.file_type === 'Image' ? (
          <div className="flex items-center justify-center w-full h-full p-6">
            <img src={resolvedAssetUrl || proof.file_url} alt={proof.formal_name || proof.name} className="max-w-full max-h-full object-contain" />
          </div>
        ) : proof.file_type === 'Video' ? (
          proof.proof_child_type === 'VideoClip' ? (
            <JurySyncedVideoClipPlayer
              src={resolvedAssetUrl || proof.video_url || proof.file_url}
              segments={proof.video_clips || []}
              videoTime={juryState.video_time}
              isPlaying={juryState.is_playing}
              syncToken={juryState.updated_date}
            />
          ) : (
            <JurySyncedVideoPlayer
              src={resolvedAssetUrl || proof.video_url || proof.file_url}
              videoTime={juryState.video_time}
              isPlaying={juryState.is_playing}
              syncToken={juryState.updated_date}
            />
          )
        ) : (resolvedAssetUrl || proof.file_url) ? (
          <PDFViewer
            fileUrl={resolvedAssetUrl || proof.file_url}
            mode="viewer"
            syncState={{
              currentPage: juryState.pdf_page || 1,
              zoom: juryState.zoom ?? 1,
              panX: juryState.panX ?? 0,
              panY: juryState.panY ?? 0,
            }}
            allowPan={false}
            visiblePages={visiblePages?.length ? visiblePages : null}
            highlights={proof.highlights || []}
            clippedPage={initialClipPage}
          />
        ) : (
          <p className="text-white/20 text-lg">No file attached</p>
        )}
      </div>

      <FullscreenButton onClick={enterFullscreen} visible={!isFullscreen} />
    </div>
  );
}