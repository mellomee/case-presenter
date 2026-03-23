import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import ExtractViewer from '@/components/proofVault/ExtractViewer.jsx';
import ExtractClipViewer from '@/components/proofVault/ExtractClipViewer.jsx';
import AttorneyHubVideoController from '@/components/attorneyHub/AttorneyHubVideoController.jsx';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

function statusPill(proof) {
  if (proof.status === 'Admitted') return 'bg-green-100 text-green-700';
  if (proof.status === 'Joint') return 'bg-blue-100 text-blue-700';
  if (proof.status === 'Demonstrative') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-600';
}

export default function AttorneyHubProofPreviewPane({ proof, juryState, onUpdateJury, onRuling, onClose }) {
  const { data: allProofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
    enabled: !!proof,
    staleTime: 2 * 60 * 1000,
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
  }, [juryState, onUpdateJury, proof?.id]);

  const handleVideoStateChange = useCallback((videoSync) => {
    if (!juryState || juryState.published_proof_id !== proof?.id || juryState.is_blank) return;
    onUpdateJury({
      video_time: videoSync.currentTime || 0,
      is_playing: !!videoSync.playing,
    });
  }, [juryState, onUpdateJury, proof?.id]);

  if (!proof) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50">
            <FileText className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-sm text-slate-500">Click an exhibit to preview</p>
        </div>
      </div>
    );
  }

  const exhibitNum = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num;
  const externalUrl = url || parentUrl || proof.video_url || proof.file_url || parentProof?.video_url || parentProof?.file_url;
  const canUnAdmit = ['Admitted', 'Demonstrative'].includes(proof.status);

  const renderPreview = () => {
    if (proof.proof_child_type === 'ExtractClip') {
      return <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" onStateChange={handlePdfStateChange} />;
    }

    if (proof.proof_child_type === 'Extract') {
      return <ExtractViewer proof={proof} mode="controller" onStateChange={handlePdfStateChange} />;
    }

    if (proof.file_type === 'Video') {
      return (
        <AttorneyHubVideoController
          sourceUrl={externalUrl}
          clipSegments={proof.proof_child_type === 'VideoClip' ? proof.video_clips || [] : []}
          onStateChange={handleVideoStateChange}
        />
      );
    }

    if (proof.file_type === 'Image' && externalUrl) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <img src={externalUrl} alt={proof.name} className="max-h-full max-w-full rounded object-contain" />
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
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto mb-2 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">No file attached</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-700 px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {exhibitNum && <span className="rounded bg-blue-900/30 px-1.5 py-0.5 font-mono text-xs font-bold text-blue-400">{exhibitNum}</span>}
            <Badge className={`text-xs ${statusPill(proof)}`}>{proof.status}</Badge>
            {canUnAdmit && (
              <button
                onClick={() => onRuling?.({
                  proofId: proof.id,
                  data: proof.status === 'Admitted'
                    ? { status: 'Joint', admitted_exhibit_num: null, admitted_by: null, admit_date: null }
                    : { status: 'Joint', demonstrative_exhibit_num: null, admitted_by: null, admit_date: null },
                })}
                className="text-xs text-blue-400 underline underline-offset-2 transition-colors hover:text-blue-300"
              >
                Un-Admit
              </button>
            )}
          </div>
          <p className="truncate text-sm font-semibold leading-tight text-white">{proof.name}</p>
          {proof.formal_name && <p className="mt-1 truncate text-xs text-slate-400">Formal Name: {proof.formal_name}</p>}
          {proof.file_source === 'dropbox' && proof.dropbox_file_name && <p className="mt-1 truncate text-xs text-slate-500">Source Filename: {proof.dropbox_file_name}</p>}
        </div>
        <div className="flex flex-shrink-0 gap-1">
          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-200">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-200" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-slate-900/50">
        {renderPreview()}
      </div>

      {proof.description && (
        <div className="shrink-0 border-t border-slate-700 bg-slate-800/50 px-4 py-2">
          <p className="text-xs leading-relaxed text-slate-400">{proof.description}</p>
        </div>
      )}
    </div>
  );
}