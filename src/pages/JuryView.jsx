import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import PDFViewer from '@/components/proofVault/PDFViewer';
import VideoClipViewer from '@/components/proofVault/VideoClipViewer.jsx';
import { parsePageRange } from '@/components/proofVault/pageRangeUtils';
import { getInitialHighlightPage } from '@/components/proofVault/highlightGroupUtils';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { Loader2, Scale, Maximize } from 'lucide-react';

function JuryVideo({ src, videoTime, isPlaying }) {
  const playerRef = useRef(null);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const newTime = videoTime ?? 0;
    const currentTime = player.getCurrentTime?.() ?? 0;
    if (Math.abs(currentTime - newTime) > 1.5) {
      player.seekTo?.(newTime, 'seconds');
    }
  }, [videoTime, src]);

  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <div className="w-full h-full max-w-full max-h-full">
        <ReactPlayer
          ref={playerRef}
          url={src}
          playing={isPlaying}
          controls={false}
          width="100%"
          height="100%"
          playsinline
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
                cc_load_policy: 1,
                cc_lang_pref: 'en',
                enablejsapi: 1,
              },
            },
          }}
        />
      </div>
    </div>
  );
}

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

function FullscreenButton() {
  const handleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <button
      onClick={handleFullscreen}
      className="absolute bottom-4 right-4 z-30 bg-white/5 hover:bg-white/15 border border-white/10 text-white/40 hover:text-white/80 p-2 rounded-lg transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
      title="Toggle fullscreen"
    >
      <Maximize className="w-4 h-4" />
    </button>
  );
}

function BlankScreen({ caseName }) {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-black group">
      <div className="text-center select-none">
        <Scale className="w-24 h-24 text-white/8 mx-auto mb-6" strokeWidth={1} />
        <p className="text-white/12 text-lg tracking-[0.3em] uppercase font-light">
          {caseName || 'Case Presenter'}
        </p>
      </div>
      <FullscreenButton />
    </div>
  );
}

export default function JuryView() {
  const { juryState } = useJurySync('jury');

  const { data: proof } = useQuery({
    queryKey: ['juryProof', juryState?.published_proof_id],
    queryFn: () => base44.entities.Proof.filter({ id: juryState.published_proof_id }).then((r) => r[0]),
    enabled: !!juryState?.published_proof_id && !juryState?.is_blank,
  });

  const { data: parentProof } = useQuery({
    queryKey: ['juryParentProof', proof?.parent_proof_id],
    queryFn: () => base44.entities.Proof.filter({ id: proof.parent_proof_id }).then((r) => r[0] || null),
    enabled: ['ExtractClip', 'VideoClip'].includes(proof?.proof_child_type) && !!proof?.parent_proof_id,
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list().then((r) => r[0] || {}),
  });

  const { url: resolvedAssetUrl, isLoading: isAssetLoading } = useResolvedProofAsset(proof);
  const { url: parentResolvedAssetUrl, isLoading: isParentAssetLoading } = useResolvedProofAsset(parentProof);

  useEffect(() => {
    const tryFs = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener('click', tryFs, { once: true });
    return () => document.removeEventListener('click', tryFs);
  }, []);

  const caseName = settings?.case_name || 'Case Presenter';
  const demoLabel = settings?.jury_demonstrative_label || 'For illustrative purposes only';
  const isBlank = !juryState || juryState.is_blank || !juryState.published_proof_id;
  const visiblePages = proof?.proof_child_type === 'Extract'
    ? parsePageRange(proof.extract_pages || '')
    : proof?.proof_child_type === 'ExtractClip'
      ? parsePageRange(parentProof?.extract_pages || '')
      : null;
  const initialClipPage = proof?.proof_child_type === 'ExtractClip'
    ? getInitialHighlightPage(proof.highlights, proof.clipped_page || 1)
    : null;
  const isExtractClipLoading = proof?.proof_child_type === 'ExtractClip' && !!proof?.parent_proof_id && parentProof === undefined;
  const isVideoClipLoading = proof?.proof_child_type === 'VideoClip' && !!proof?.parent_proof_id && (parentProof === undefined || isParentAssetLoading);
  const resolvedVideoUrl = resolvedAssetUrl || parentResolvedAssetUrl || proof?.video_url || proof?.file_url || parentProof?.video_url || parentProof?.file_url;

  if (!juryState) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white/15" />
      </div>
    );
  }

  if (isBlank) {
    return <BlankScreen caseName={caseName} />;
  }

  if (!proof || isAssetLoading || isExtractClipLoading || isVideoClipLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white/15" />
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
        ) : proof.proof_child_type === 'VideoClip' ? (
          <div className="w-full h-full p-6">
            <VideoClipViewer
              videoUrl={resolvedVideoUrl}
              segments={proof.video_clips || []}
              mode="viewer"
              syncState={{
                currentTime: juryState.video_time || 0,
                playing: !!juryState.is_playing,
                currentSegmentIdx: juryState.video_segment_index ?? 0,
              }}
            />
          </div>
        ) : proof.file_type === 'Video' ? (
          <JuryVideo src={resolvedVideoUrl} videoTime={juryState.video_time} isPlaying={juryState.is_playing} />
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

      <FullscreenButton />
    </div>
  );
}