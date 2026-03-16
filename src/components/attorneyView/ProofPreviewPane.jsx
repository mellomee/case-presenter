import React, { useRef, useCallback, useMemo } from 'react';
import { FileText, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import { getHighlightBounds, getPrimaryHighlightPage } from '@/lib/proofPdfUtils';
import JuryPublishBar from './JuryPublishBar.jsx';

function statusPill(proof) {
  if (proof.status === 'Admitted') return 'bg-green-100 text-green-700';
  if (proof.status === 'Joint') return 'bg-blue-100 text-blue-700';
  if (proof.status === 'Demonstrative') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-600';
}

export default function ProofPreviewPane({ proof, juryState, onUpdateJury, onClose }) {
  const videoRef = useRef(null);

  const handlePdfStateChange = useCallback((pdfSync) => {
    if (!juryState || juryState.published_proof_id !== proof?.id || juryState.is_blank) return;
    onUpdateJury({ pdf_page: pdfSync.currentPage });
  }, [juryState, proof, onUpdateJury]);

  const handleVideoTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !juryState || juryState.published_proof_id !== proof?.id || juryState.is_blank) return;
    onUpdateJury({ video_time: el.currentTime, is_playing: !el.paused });
  }, [juryState, proof, onUpdateJury]);

  const handleVideoPlay = useCallback(() => {
    if (juryState?.published_proof_id === proof?.id && !juryState?.is_blank) {
      onUpdateJury({ is_playing: true });
    }
  }, [juryState, proof, onUpdateJury]);

  const handleVideoPause = useCallback(() => {
    if (juryState?.published_proof_id === proof?.id && !juryState?.is_blank) {
      onUpdateJury({ is_playing: false });
    }
  }, [juryState, proof, onUpdateJury]);

  if (!proof) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm text-slate-500">Click an exhibit to preview</p>
        </div>
      </div>
    );
  }

  const exhibitNum = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num;
  const hasHighlightFocus = Array.isArray(proof.highlights) && proof.highlights.length > 0;
  const isPublishedProof = juryState?.published_proof_id === proof.id && !juryState?.is_blank;
  const defaultPdfPage = proof.clipped_page || getPrimaryHighlightPage(proof.highlights || [], 1);
  const activePdfPage = isPublishedProof ? (juryState?.pdf_page || defaultPdfPage) : defaultPdfPage;
  const highlightBounds = getHighlightBounds(proof.highlights || [], activePdfPage, proof.clipped_page || 1);

  const pdfSyncState = useMemo(() => {
    if (!isPublishedProof && !hasHighlightFocus) return undefined;

    const nextState = {
      currentPage: activePdfPage,
      focusOrigin: 'top center',
    };

    if (hasHighlightFocus && highlightBounds) {
      const dominantSide = Math.max(highlightBounds.width, highlightBounds.height);
      nextState.zoom = Math.min(3.5, Math.max(1.4, 55 / Math.max(dominantSide, 12)));
      nextState.panX = 0;
      nextState.panY = 0;
      nextState.focusOrigin = `${highlightBounds.centerX}% ${highlightBounds.centerY}%`;
    }

    return nextState;
  }, [activePdfPage, hasHighlightFocus, highlightBounds, isPublishedProof]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-start justify-between gap-2 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {exhibitNum && (
              <span className="text-xs font-bold font-mono text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
                {exhibitNum}
              </span>
            )}
            <Badge className={`text-xs ${statusPill(proof)}`}>{proof.status}</Badge>
          </div>
          <p className="text-sm font-semibold text-white leading-tight truncate">
            {proof.formal_name || proof.name}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {proof.file_url && (
            <a href={proof.file_url} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-200">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-200" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden bg-slate-900/50 min-h-0">
        {proof.file_url ? (
          <div className="w-full h-full">
            {proof.file_type === 'Image' ? (
              <div className="flex items-center justify-center h-full p-4">
                <img
                  src={proof.file_url}
                  alt={proof.formal_name || proof.name}
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            ) : proof.file_type === 'Video' ? (
              <div className="flex items-center justify-center h-full p-4">
                <video
                  ref={videoRef}
                  src={proof.video_url || proof.file_url}
                  controls
                  className="max-w-full max-h-full rounded"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                />
              </div>
            ) : (
              <PDFViewer
                fileUrl={proof.file_url}
                mode="controller"
                onStateChange={handlePdfStateChange}
                highlights={proof.highlights || []}
                clippedPage={proof.clipped_page || null}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No file attached</p>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {proof.description && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <p className="text-xs text-slate-400 leading-relaxed">{proof.description}</p>
        </div>
      )}

      {/* Jury Publish Bar */}
      <JuryPublishBar proof={proof} juryState={juryState} onUpdate={onUpdateJury} />
    </div>
  );
}