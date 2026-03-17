import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import VideoViewer from '@/components/proofVault/VideoViewer.jsx';
import VideoClipViewer from '@/components/proofVault/VideoClipViewer.jsx';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import JuryPublishBar from './JuryPublishBar.jsx';

function statusPill(proof) {
  if (proof.status === 'Admitted') return 'bg-green-100 text-green-700';
  if (proof.status === 'Joint') return 'bg-blue-100 text-blue-700';
  if (proof.status === 'Demonstrative') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-600';
}

export default function ProofPreviewPane({ proof, juryState, onUpdateJury, onClose }) {
  const { data: allProofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
    enabled: !!proof,
  });

  const { url } = useResolvedProofAsset(proof);
  const parentProof = proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) : null;
  const { url: parentUrl } = useResolvedProofAsset(parentProof);

  const handlePdfStateChange = useCallback((pdfSync) => {
    if (!juryState || juryState.published_proof_id !== proof?.id || juryState.is_blank) return;
    onUpdateJury({
      pdf_page: pdfSync.currentPage,
      ...(pdfSync.zoom !== undefined ? { zoom: pdfSync.zoom } : {}),
      ...(pdfSync.panX !== undefined ? { panX: pdfSync.panX } : {}),
      ...(pdfSync.panY !== undefined ? { panY: pdfSync.panY } : {}),
    });
  }, [juryState, proof, onUpdateJury]);

  const handleVideoStateChange = useCallback((videoSync) => {
    if (!juryState || juryState.published_proof_id !== proof?.id || juryState.is_blank) return;
    onUpdateJury({
      video_time: videoSync.currentTime || 0,
      is_playing: !!videoSync.playing,
      ...(videoSync.segmentIndex !== undefined ? { clip_segment_index: videoSync.segmentIndex } : {}),
    });
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
  const externalUrl = url || parentUrl || proof.video_url || proof.file_url || parentProof?.video_url || parentProof?.file_url;

  const renderPreview = () => {
    if (proof.proof_child_type === 'ExtractClip') {
      return (
        <ExtractClipViewer
          proof={proof}
          allProofs={allProofs}
          mode="controller"
          onStateChange={handlePdfStateChange}
        />
      );
    }

    if (proof.proof_child_type === 'Extract') {
      return (
        <ExtractViewer
          proof={proof}
          mode="controller"
          onStateChange={handlePdfStateChange}
        />
      );
    }

    if (proof.proof_child_type === 'VideoClip') {
      return (
        <div className="w-full h-full p-4">
          <VideoClipViewer
            videoUrl={externalUrl}
            segments={proof.video_clips || []}
            onStateChange={handleVideoStateChange}
          />
        </div>
      );
    }

    if (proof.file_type === 'Video') {
      return (
        <VideoViewer
          proof={proof}
          allProofs={allProofs}
          mode="controller"
          onStateChange={handleVideoStateChange}
        />
      );
    }

    if (proof.file_type === 'Image' && externalUrl) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            src={externalUrl}
            alt={proof.name}
            className="max-w-full max-h-full object-contain rounded"
          />
        </div>
      );
    }

    if (externalUrl) {
      return (
        <PDFViewer
          fileUrl={externalUrl}
          mode="controller"
          onStateChange={handlePdfStateChange}
          highlights={proof.highlights || []}
          clippedPage={proof.clipped_page || null}
        />
      );
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No file attached</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
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
          <p className="text-sm font-semibold text-white leading-tight truncate">{proof.name}</p>
          {proof.formal_name && (
            <p className="text-xs text-slate-400 truncate mt-1">Formal Name: {proof.formal_name}</p>
          )}
          {proof.file_source === 'dropbox' && proof.dropbox_file_name && (
            <p className="text-xs text-slate-500 truncate mt-1">Source Filename: {proof.dropbox_file_name}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
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

      <div className="flex-1 overflow-hidden bg-slate-900/50 min-h-0">
        {renderPreview()}
      </div>

      {proof.description && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
          <p className="text-xs text-slate-400 leading-relaxed">{proof.description}</p>
        </div>
      )}

      <JuryPublishBar proof={proof} juryState={juryState} onUpdate={onUpdateJury} />
    </div>
  );
}