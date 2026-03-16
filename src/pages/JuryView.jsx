import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import { getPrimaryHighlightPage } from '@/lib/proofPdfUtils';
import { Loader2, Scale, Maximize } from 'lucide-react';

function JuryPDF({ proof, page }) {
  const startingPage = getPrimaryHighlightPage(proof.highlights || [], proof.clipped_page || 1);

  return (
    <div className="w-full h-full">
      <PDFViewer
        fileUrl={proof.file_url}
        mode="viewer"
        syncState={{ currentPage: page || startingPage }}
        highlights={proof.highlights || []}
        clippedPage={startingPage}
        showHighlights={Array.isArray(proof.highlights) && proof.highlights.length > 0}
        autoFocusHighlights={Array.isArray(proof.highlights) && proof.highlights.length > 0}
        dimInactiveArea={Array.isArray(proof.highlights) && proof.highlights.length > 0}
        allowPan={false}
      />
    </div>
  );
}

function JuryVideo({ proof, videoTime, isPlaying }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const nextTime = videoTime ?? 0;
    if (Math.abs(element.currentTime - nextTime) > 1.5) element.currentTime = nextTime;
  }, [videoTime]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (isPlaying && element.paused) element.play().catch(() => {});
    else if (!isPlaying && !element.paused) element.pause();
  }, [isPlaying]);

  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <video ref={videoRef} src={proof.video_url || proof.file_url} className="max-w-full max-h-full" />
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
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.();
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
    queryFn: () => base44.entities.Proof.filter({ id: juryState.published_proof_id }).then((rows) => rows[0]),
    enabled: !!juryState?.published_proof_id && !juryState?.is_blank,
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list().then((rows) => rows[0] || {}),
  });

  useEffect(() => {
    const tryFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener('click', tryFullscreen, { once: true });
    return () => document.removeEventListener('click', tryFullscreen);
  }, []);

  const caseName = settings?.case_name || 'Case Presenter';
  const demoLabel = settings?.jury_demonstrative_label || 'For illustrative purposes only';
  const isBlank = !juryState || juryState.is_blank || !juryState.published_proof_id;

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

  if (!proof) {
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
            <img
              src={proof.file_url}
              alt={proof.formal_name || proof.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : proof.file_type === 'Video' ? (
          <JuryVideo proof={proof} videoTime={juryState.video_time} isPlaying={juryState.is_playing} />
        ) : proof.file_url ? (
          <JuryPDF proof={proof} page={juryState.pdf_page || proof.clipped_page || 1} />
        ) : (
          <p className="text-white/20 text-lg">No file attached</p>
        )}
      </div>

      <FullscreenButton />
    </div>
  );
}