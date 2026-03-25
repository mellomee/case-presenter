import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import { ChevronLeft, ChevronRight, Loader2, Maximize, Save, Scale } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import MarkupCanvas from '@/components/witnessMarkup/MarkupCanvas.jsx';
import MarkupToolbar from '@/components/witnessMarkup/MarkupToolbar.jsx';
import { exportElementToPdfBase64 } from '@/lib/witnessMarkupExport';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { getPrimaryExhibitNumber } from '@/lib/dropboxPdfProcessing';
import { useWitnessSync } from '@/components/witnessView/useWitnessSync.jsx';

const PEN_COLOR = '#ef4444';
const HIGHLIGHT_COLOR = '#facc15';

function FullscreenButton({ onClick, visible }) {
  return (
    <button
      onClick={onClick}
      className={`absolute bottom-4 right-4 z-30 rounded-lg border border-white/15 bg-white/10 p-2.5 text-white/80 transition-all hover:bg-white/20 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      title="Enter fullscreen"
    >
      <Maximize className="h-4 w-4" />
    </button>
  );
}

function WitnessBlankScreen({ caseName, onEnterFullscreen, isFullscreen, actionLabel, onAction }) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-black group">
      <div className="text-center select-none">
        <Scale className="mx-auto mb-6 h-[200px] w-[200px] text-white/25" strokeWidth={1} />
        <p className="text-lg font-light uppercase tracking-[0.3em] text-white/12">
          {caseName || 'Case Presenter'}
        </p>
        {actionLabel && onAction ? (
          <div className="mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={onAction}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </div>
      <FullscreenButton onClick={onEnterFullscreen} visible={!isFullscreen} />
    </div>
  );
}

function WitnessMediaPreview({ proof, fileUrl, witnessState }) {
  const playerRef = React.useRef(null);

  React.useEffect(() => {
    if (proof?.file_type !== 'Video') return;
    const player = playerRef.current;
    if (!player) return;
    const newTime = witnessState?.video_time ?? 0;
    const currentTime = player.getCurrentTime?.() ?? 0;
    if (Math.abs(currentTime - newTime) > 1.5) {
      player.seekTo?.(newTime, 'seconds');
    }
  }, [proof?.file_type, fileUrl, witnessState?.video_time]);

  if (proof?.file_type === 'Image' && fileUrl) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <img src={fileUrl} alt={proof?.formal_name || proof?.name} className="max-h-full max-w-full rounded-xl object-contain" />
      </div>
    );
  }

  if (proof?.file_type === 'Video' && fileUrl) {
    return (
      <div className="min-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
        <ReactPlayer ref={playerRef} url={fileUrl} playing={!!witnessState?.is_playing} controls width="100%" height="70vh" playsinline />
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
      No file available.
    </div>
  );
}

export default function WitnessMarkup() {
  const { witnessState } = useWitnessSync('witness');
  const urlParams = new URLSearchParams(window.location.search);
  const proofIdFromUrl = urlParams.get('proofId') || '';
  const requestedWitnessName = urlParams.get('witness') || '';
  const requestedPage = Number(urlParams.get('page') || '1') || 1;
  const activeProofId = proofIdFromUrl || witnessState?.published_proof_id || '';
  const isPublishedWitnessView = !proofIdFromUrl;

  const captureRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [witnessName, setWitnessName] = useState(requestedWitnessName);
  const [currentPage, setCurrentPage] = useState(requestedPage);
  const [numPages, setNumPages] = useState(1);
  const [strokes, setStrokes] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [showBlankScreen, setShowBlankScreen] = useState(false);

  const { data: proof, isLoading } = useQuery({
    queryKey: ['witness-markup-proof', activeProofId],
    queryFn: async () => {
      const records = await base44.entities.Proof.filter({ id: activeProofId });
      return records[0] || null;
    },
    enabled: !!activeProofId,
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list().then((records) => records[0] || {}),
  });

  const { url: fileUrl, isLoading: isLoadingAsset } = useResolvedProofAsset(proof);

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

  useEffect(() => {
    if (proofIdFromUrl) {
      setCurrentPage(requestedPage);
      return;
    }

    if (witnessState?.published_proof_id) {
      setCurrentPage(Math.max(1, witnessState?.pdf_page || 1));
    }
  }, [proofIdFromUrl, requestedPage, witnessState?.published_proof_id, witnessState?.pdf_page]);

  useEffect(() => {
    setStrokes([]);
    setHighlights([]);
    setSaveMessage('');
  }, [activeProofId]);

  const canUndo = strokes.length > 0 || highlights.length > 0;
  const exhibitNumber = useMemo(() => getPrimaryExhibitNumber(proof), [proof]);
  const isWitnessBlank = isPublishedWitnessView && (!witnessState || witnessState.is_blank || !witnessState.published_proof_id);
  const isPdf = proof?.file_type === 'PDF';
  const caseName = settings?.case_name || 'Case Presenter';
  const shouldShowBlankScreen = showBlankScreen || isWitnessBlank || !activeProofId;

  const handleUndo = () => {
    if (strokes.length > 0) {
      setStrokes((current) => current.slice(0, -1));
      return;
    }
    setHighlights((current) => current.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    setHighlights([]);
  };

  const handleSave = async () => {
    if (!proof || !captureRef.current || !witnessName.trim()) {
      setSaveMessage('Enter a witness name before saving.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    const pdfBase64 = await exportElementToPdfBase64(captureRef.current);
    const response = await base44.functions.invoke('saveWitnessMarkupProof', {
      parentProof: proof,
      pageNumber: currentPage,
      witnessName: witnessName.trim(),
      pdfBase64,
      highlights: highlights.map((highlight) => ({
        ...highlight,
        page: currentPage,
      })),
      markup: {
        page: currentPage,
        toolset: 'freehand_and_highlights',
        strokes,
        highlights,
      },
    });

    const result = response.data || {};
    setIsSaving(false);

    if (result.error) {
      setSaveMessage(result.error);
      return;
    }

    setSaveMessage(`Saved as ${result.proof?.name || 'new proof'}.`);
    setStrokes([]);
    setHighlights([]);
  };

  if (shouldShowBlankScreen) {
    return (
      <WitnessBlankScreen
        caseName={caseName}
        onEnterFullscreen={enterFullscreen}
        isFullscreen={isFullscreen}
        actionLabel={showBlankScreen && activeProofId ? 'Return to Witness View' : null}
        onAction={showBlankScreen && activeProofId ? () => setShowBlankScreen(false) : null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBlankScreen(true)}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                Black Screen
              </Button>
              {exhibitNumber ? <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{exhibitNumber}</span> : null}
              {isPublishedWitnessView && witnessState?.exhibit_label ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{witnessState.exhibit_label}</span> : null}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{proof?.name || 'Witness View'}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {isPdf ? 'Witness can annotate and highlight this PDF, then save it back as a new proof.' : 'Witness is viewing the proof published from Attorney Hub.'}
            </p>
          </div>

          {isPdf ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <div className="min-w-[96px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700">
                Page {currentPage} / {numPages}
              </div>
              <Button variant="outline" onClick={() => setCurrentPage((page) => Math.min(numPages, page + 1))} disabled={currentPage >= numPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isLoading || isLoadingAsset} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as Proof
              </Button>
            </div>
          ) : null}
        </div>

        {isPdf ? (
          <>
            <MarkupToolbar
              witnessName={witnessName}
              onWitnessNameChange={setWitnessName}
              tool={tool}
              onToolChange={setTool}
              onUndo={handleUndo}
              onClear={handleClear}
              canUndo={canUndo}
            />

            {saveMessage ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                {saveMessage}
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Annotation tools are available for PDFs only.
          </div>
        )}

        {(isLoading || isLoadingAsset) ? (
          <div className="flex min-h-[70vh] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : isPdf ? (
          <MarkupCanvas
            captureRef={captureRef}
            fileUrl={fileUrl}
            pageNumber={currentPage}
            tool={tool}
            penColor={PEN_COLOR}
            highlightColor={HIGHLIGHT_COLOR}
            strokes={strokes}
            highlights={highlights}
            onAddStroke={(stroke) => setStrokes((current) => [...current, stroke])}
            onAddHighlight={(highlight) => setHighlights((current) => [...current, highlight])}
            onLoadDocument={(pages) => {
              setNumPages(pages || 1);
              setCurrentPage((page) => Math.min(Math.max(page, 1), pages || 1));
            }}
          />
        ) : (
          <WitnessMediaPreview proof={proof} fileUrl={fileUrl} witnessState={witnessState} />
        )}
      </div>
      <FullscreenButton onClick={enterFullscreen} visible={!isFullscreen} />
    </div>
  );
}