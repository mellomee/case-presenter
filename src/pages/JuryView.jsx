import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.js';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function JuryPDF({ fileUrl, page, highlights = [] }) {
  return (
    <Document
      file={fileUrl}
      loading={<div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-white/30" /></div>}
      className="flex items-center justify-center w-full h-full"
    >
      <div className="relative">
        <Page
          pageNumber={page || 1}
          width={Math.min(window.innerWidth * 0.88, 1100)}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={<div className="w-full h-full bg-zinc-800 animate-pulse rounded" />}
        />
        {highlights.map((h, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: `${h.width}%`,
              height: `${h.height}%`,
              background: h.color || '#fbbf24',
              opacity: h.opacity ?? 0.4,
              pointerEvents: 'none',
              borderRadius: '2px',
              mixBlendMode: 'multiply',
            }}
          />
        ))}
      </div>
    </Document>
  );
}

function JuryVideo({ proof, videoTime, isPlaying }) {
  const videoRef = useRef(null);
  const syncRef = useRef({ time: videoTime, playing: isPlaying });

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const newTime = videoTime ?? 0;
    if (Math.abs(el.currentTime - newTime) > 1.5) {
      el.currentTime = newTime;
    }
  }, [videoTime]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying && el.paused) el.play().catch(() => {});
    else if (!isPlaying && !el.paused) el.pause();
  }, [isPlaying]);

  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <video
        ref={videoRef}
        src={proof.video_url || proof.file_url}
        className="max-w-full max-h-full"
      />
    </div>
  );
}

export default function JuryView() {
  const { juryState } = useJurySync('jury');

  const { data: proof } = useQuery({
    queryKey: ['proof', juryState?.published_proof_id],
    queryFn: () => base44.entities.Proof.filter({ id: juryState.published_proof_id }).then(r => r[0]),
    enabled: !!juryState?.published_proof_id,
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list().then(r => r[0] || {}),
  });

  const isBlank = !juryState || juryState.is_blank || !juryState.published_proof_id;

  if (!juryState) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-white/20" />
      </div>
    );
  }

  if (isBlank) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="text-center">
          <div className="text-9xl mb-8 opacity-10">⚖️</div>
          <p className="text-white/20 text-xl tracking-widest uppercase">
            {settings?.case_name || 'Case Presenter'}
          </p>
        </div>
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-white/20" />
      </div>
    );
  }

  const isDemo = proof.status === 'Demonstrative';
  const demoLabel = settings?.jury_demonstrative_label || 'For illustrative purposes only';

  return (
    <div className="flex flex-col w-full h-screen bg-black overflow-hidden">
      {/* Exhibit Label Bar */}
      {juryState.exhibit_label && (
        <div className="flex-shrink-0 flex items-center justify-center bg-black/80 border-b border-white/5 py-2 px-6">
          <span className="text-white/70 text-base font-semibold tracking-wide">
            {juryState.exhibit_label}
          </span>
          {isDemo && (
            <span className="ml-4 text-amber-400/60 text-sm italic">
              {demoLabel}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex items-center justify-center">
        {proof.file_type === 'Image' ? (
          <div className="flex items-center justify-center w-full h-full p-8">
            <img
              src={proof.file_url}
              alt={proof.formal_name || proof.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : proof.file_type === 'Video' ? (
          <JuryVideo
            proof={proof}
            videoTime={juryState.video_time}
            isPlaying={juryState.is_playing}
          />
        ) : proof.file_url ? (
          <JuryPDF
            fileUrl={proof.file_url}
            page={juryState.pdf_page || 1}
            highlights={proof.highlights || []}
          />
        ) : (
          <div className="text-white/30 text-center">
            <p className="text-xl">No file available</p>
          </div>
        )}
      </div>

      {/* Demonstrative watermark */}
      {isDemo && (
        <div className="absolute bottom-6 right-8 pointer-events-none">
          <span className="text-amber-400/30 text-sm font-medium italic">{demoLabel}</span>
        </div>
      )}
    </div>
  );
}