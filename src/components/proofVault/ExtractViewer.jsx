import React from 'react';
import { Loader2 } from 'lucide-react';
import PDFViewer from './PDFViewer';
import { parsePageRange } from './pageRangeUtils';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

export default function ExtractViewer({ proof, mode = 'controller', syncState, onStateChange }) {
  const { url, isLoading } = useResolvedProofAsset(proof);
  const visiblePages = parsePageRange(proof?.extract_pages || '');

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
    <PDFViewer
      fileUrl={url}
      mode={mode}
      syncState={syncState}
      onStateChange={onStateChange}
      visiblePages={visiblePages.length > 0 ? visiblePages : null}
    />
  );
}