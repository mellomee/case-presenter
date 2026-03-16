import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pdfjs } from 'react-pdf';
import { Badge } from '@/components/ui/badge';
import { parsePageRange } from './pageRangeUtils';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PdfPageCountBadge({ proof, sourceFileUrl }) {
  const derivedPageCount = useMemo(() => {
    if (proof.file_type !== 'PDF') return null;
    if (proof.proof_child_type === 'ExtractClip') return 1;
    if (proof.proof_child_type === 'Extract' && proof.extract_pages) {
      return parsePageRange(proof.extract_pages).length;
    }
    return null;
  }, [proof]);

  const { data: loadedPageCount } = useQuery({
    queryKey: ['pdf-page-count', sourceFileUrl],
    enabled: proof.file_type === 'PDF' && !derivedPageCount && !!sourceFileUrl,
    queryFn: async () => {
      const pdf = await pdfjs.getDocument(sourceFileUrl).promise;
      return pdf.numPages;
    },
    staleTime: Infinity,
  });

  const pageCount = derivedPageCount || loadedPageCount;

  if (!pageCount) return null;

  return <Badge className="bg-slate-100 text-slate-700 text-xs">{pageCount} {pageCount === 1 ? 'page' : 'pages'}</Badge>;
}