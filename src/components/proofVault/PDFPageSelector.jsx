import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFPageSelector({ fileUrl, selectedPages = [], onChange, disabled = false }) {
  const [numPages, setNumPages] = useState(0);

  const togglePage = (pageNumber) => {
    if (disabled) return;

    if (selectedPages.includes(pageNumber)) {
      onChange(selectedPages.filter((page) => page !== pageNumber));
      return;
    }

    onChange([...selectedPages, pageNumber].sort((a, b) => a - b));
  };

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={({ numPages: nextPageCount }) => setNumPages(nextPageCount)}
      loading={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>}
      error={<div className="text-sm text-red-600 py-6">Unable to load PDF pages.</div>}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[24rem] overflow-y-auto p-1">
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          const isSelected = selectedPages.includes(pageNumber);

          return (
            <button
              key={pageNumber}
              type="button"
              disabled={disabled}
              onClick={() => togglePage(pageNumber)}
              className={`rounded-lg border p-2 text-left transition ${isSelected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-400'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <Page
                  pageNumber={pageNumber}
                  width={180}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div className="h-[235px] bg-slate-100 animate-pulse" />}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Page {pageNumber}</span>
                <span className={isSelected ? 'text-blue-700 font-semibold' : 'text-slate-400'}>
                  {isSelected ? 'Selected' : 'Click to add'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Document>
  );
}