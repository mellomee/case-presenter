import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogClose } from '@/components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import PDFViewer from './PDFViewer';
import ExtractViewer from './ExtractViewer';
import ExtractClipViewer from './ExtractClipViewer';
import VideoViewer from './VideoViewer';
import VideoClipViewer from './VideoClipViewer';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

export default function ProofViewerModal({ proof, allProofs, isOpen, onClose }) {
  const [viewerState, setViewerState] = useState({ currentPage: 1, zoom: 1, panX: 0, panY: 0 });
  const { url, isLoading } = useResolvedProofAsset(proof);

  if (!proof) return null;

  const isExtract = proof.proof_child_type === 'Extract';
  const isExtractClip = proof.proof_child_type === 'ExtractClip';
  const isVideoClip = proof.proof_child_type === 'VideoClip';
  const resolvedVideoProof = {
    ...proof,
    file_url: proof.file_type === 'Video' ? '' : url || proof.file_url,
    video_url: proof.file_type === 'Video' ? (url || proof.video_url || proof.file_url) : proof.video_url,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl h-[90vh] p-0 bg-zinc-900 border-zinc-700" onPointerDownOutside={() => onClose?.()}>
        <DialogHeader className="absolute top-0 right-0 p-4 z-10">
          <DialogClose asChild>
            <button className="text-zinc-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="w-full h-full flex flex-col">
          {isLoading && proof.file_source === 'dropbox' ? (
            <div className="flex items-center justify-center h-full text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : isExtractClip ? (
            <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : isExtract ? (
            <ExtractViewer proof={proof} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : isVideoClip ? (
            <div className="p-6">
              <VideoClipViewer videoUrl={url || proof.video_url || proof.file_url} segments={proof.video_clips || []} />
            </div>
          ) : proof.file_type === 'Video' ? (
            <VideoViewer proof={resolvedVideoProof} allProofs={allProofs} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : (
            <PDFViewer fileUrl={url || proof.file_url} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}