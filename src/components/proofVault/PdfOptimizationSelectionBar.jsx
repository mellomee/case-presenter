import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PdfOptimizationSelectionBar({ selectedCount = 0, eligibleCount = 0, isProcessing = false, onOptimize }) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-blue-900">
        {eligibleCount} Dropbox PDF{eligibleCount === 1 ? '' : 's'} can be processed out of {selectedCount} selected.
      </p>
      <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onOptimize} disabled={eligibleCount === 0 || isProcessing}>
        {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><FileText className="w-4 h-4" /> Optimize selected PDFs</>}
      </Button>
    </div>
  );
}