import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import PDFViewer from './PDFViewer';
import ExtractClipViewer from './ExtractClipViewer';
import VideoViewer from './VideoViewer';
import VideoClipViewer from './VideoClipViewer';

export default function ProofViewerModal({ proof, allProofs, isOpen, onClose }) {
  const [viewerState, setViewerState] = useState({ currentPage: 1, zoom: 1, panX: 0, panY: 0 });

  if (!proof) return null;

  const isExtractClip = proof.proof_child_type === 'ExtractClip';
  const isVideoClip = proof.proof_child_type === 'VideoClip';

  let title = proof.formal_name || proof.name;
  if (isExtractClip) title = `${proof.name} (Extract Clip)`;
  if (isVideoClip) title = `${proof.name} (Video Clip)`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl h-[90vh] p-0 bg-zinc-900 border-zinc-700">
        <DialogHeader className="absolute top-0 right-0 p-4 z-10">
          <DialogClose asChild>
            <button className="text-zinc-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="w-full h-full flex flex-col">
          {isExtractClip ? (
            <ExtractClipViewer proof={proof} allProofs={allProofs} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : isVideoClip ? (
            <div className="p-6">
              <VideoClipViewer videoUrl={proof.video_url || proof.file_url} segments={proof.video_clips || []} />
            </div>
          ) : proof.file_type === 'Video' ? (
            <VideoViewer proof={proof} allProofs={allProofs} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          ) : (
            <PDFViewer fileUrl={proof.file_url} mode="controller" syncState={viewerState} onStateChange={setViewerState} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}