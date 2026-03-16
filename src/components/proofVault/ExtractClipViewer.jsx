import React from 'react';
import PDFViewer from './PDFViewer';
import { FileText, Layers, Scissors } from 'lucide-react';

export default function ExtractClipViewer({ proof, allProofs = [], mode = 'controller', syncState, onStateChange }) {
  if (!proof) return null;

  const parentExtract = allProofs.find((p) => p.id === proof.parent_proof_id);
  const originalPDF = parentExtract ? allProofs.find((p) => p.id === parentExtract.parent_proof_id) : null;
  const fileUrl = proof.file_url;

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Metadata chain banner */}
      <div className="shrink-0 bg-zinc-800 border-b border-zinc-700 px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {originalPDF && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-zinc-500">PDF:</span>
              <span className="text-zinc-200 font-medium">{originalPDF.name}</span>
              {originalPDF.formal_name && originalPDF.formal_name !== originalPDF.name && (
                <span className="text-zinc-500 italic">"{originalPDF.formal_name}"</span>
              )}
            </div>
            <span className="text-zinc-600 text-xs">›</span>
          </>
        )}

        {parentExtract && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-zinc-500">Extract:</span>
              <span className="text-zinc-200 font-medium">{parentExtract.name}</span>
              {parentExtract.formal_name && parentExtract.formal_name !== parentExtract.name && (
                <span className="text-zinc-500 italic">"{parentExtract.formal_name}"</span>
              )}
            </div>
            <span className="text-zinc-600 text-xs">›</span>
          </>
        )}

        <div className="flex items-center gap-1.5 text-xs">
          <Scissors className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="text-zinc-500">Clip:</span>
          <span className="text-zinc-200 font-semibold">{proof.name}</span>
          {proof.formal_name && proof.formal_name !== proof.name && (
            <span className="text-zinc-500 italic">"{proof.formal_name}"</span>
          )}
          {proof.clipped_page && (
            <span className="ml-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] px-1.5 py-0.5 rounded font-mono">
              Page {proof.clipped_page}
            </span>
          )}
        </div>

        {(proof.admitted_exhibit_num || proof.joint_exhibit_num) && (
          <span className="ml-auto text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded font-mono">
            Ex. {proof.admitted_exhibit_num || proof.joint_exhibit_num}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {fileUrl ? (
          <PDFViewer
            key={proof.id}
            fileUrl={fileUrl}
            mode={mode}
            syncState={syncState}
            onStateChange={onStateChange}
            highlights={proof.highlights || []}
            clippedPage={proof.clipped_page || 1}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No file attached to this clip</div>
        )}
      </div>
    </div>
  );
}