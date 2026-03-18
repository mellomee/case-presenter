import React, { useMemo } from 'react';
import PDFViewer from '@/components/proofVault/PDFViewer.jsx';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';

export default function ProofPreviewCard({ proof, onStateChange, publishable, published, liveSync, onToggleLiveSync, onPublish, onBlankJury }) {
  const { url } = useResolvedProofAsset(proof);
  const proofUrl = useMemo(() => url || proof?.video_url || proof?.file_url || '', [url, proof]);

  if (!proof) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Select a proof node to preview it here.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{proof.formal_name || proof.name}</p>
          <p className="text-xs text-slate-500 truncate">{proof.file_type} · {proof.status || 'Draft'}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className={`rounded-full px-2 py-1 ${published ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
            {published ? 'Published' : 'Private'}
          </span>
          <span className={`rounded-full px-2 py-1 ${liveSync ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
            {liveSync ? 'Live Sync' : 'Snapshot'}
          </span>
        </div>
      </div>

      <div className="h-[340px] bg-slate-950">
        {proof.file_type === 'Image' && proofUrl ? (
          <div className="flex h-full items-center justify-center p-4">
            <img src={proofUrl} alt={proof.name} className="max-h-full max-w-full rounded-xl object-contain" />
          </div>
        ) : proof.file_type === 'Video' && proofUrl ? (
          <video
            src={proofUrl}
            controls
            className="h-full w-full bg-black"
            onTimeUpdate={(event) => onStateChange?.({ currentTime: event.currentTarget.currentTime })}
            onPlay={() => onStateChange?.({ playing: true })}
            onPause={() => onStateChange?.({ playing: false })}
          />
        ) : proofUrl ? (
          <PDFViewer
            fileUrl={proofUrl}
            mode="controller"
            onStateChange={onStateChange}
            highlights={proof.highlights || []}
            clippedPage={proof.clipped_page || null}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No preview available</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-3">
        <button
          onClick={onPublish}
          disabled={!publishable}
          className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Publish Snapshot
        </button>
        <button
          onClick={onToggleLiveSync}
          disabled={!publishable}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {liveSync ? 'Stop Live Sync' : 'Start Live Sync'}
        </button>
        <button
          onClick={onBlankJury}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Blank Jury
        </button>
        {!publishable && (
          <span className="text-xs text-amber-600">Publish is available for admitted, demonstrative, or deposition proofs.</span>
        )}
      </div>
    </div>
  );
}