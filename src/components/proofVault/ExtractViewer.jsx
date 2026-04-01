import React from 'react';
import { Loader2 } from 'lucide-react';
import PDFViewer from './PDFViewer';
import { parsePageRange } from './pageRangeUtils';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

export default function ExtractViewer({ proof, mode = 'controller', syncState, onStateChange, pageOverlay = null, topOverlay = null, forceAllowPan = null }) {
  const { url, isLoading } = useResolvedProofAsset(proof);

  // Only restrict visible pages when the extract is pointing at the original parent PDF
  // (i.e. same file as the parent). If it has been processed into its own Dropbox file
  // (optimized_for_viewer = true), the PDF is already trimmed — no page restriction needed.
  const isOwnFile = proof?.optimized_for_viewer === true;
  const visiblePages = isOwnFile ? null : parsePageRange(proof?.extract_pages || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!url) {
    return <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No file attached to this extract</div>;
  }

  return (
    <div className="h-full" style={{ touchAction: forceAllowPan ? 'none' : 'auto' }}>
      <PDFViewer
      fileUrl={url}
      mode={mode}
      syncState={syncState}
      onStateChange={onStateChange}
      visiblePages={visiblePages && visiblePages.length > 0 ? visiblePages : null}
      pageOverlay={pageOverlay}
      topOverlay={topOverlay}
      forceAllowPan={forceAllowPan}
    />
    </div>
  );
}