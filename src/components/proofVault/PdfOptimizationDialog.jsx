import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PdfProcessingOptions from '@/components/proofVault/PdfProcessingOptions.jsx';

export default function PdfOptimizationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isSubmitting = false,
  progressValue = 0,
  progressLabel = '',
  initialOptions = { addCoverPage: true, addPageNumbers: true, optimizePdf: true },
  onSubmit,
}) {
  const [addCoverPage, setAddCoverPage] = useState(initialOptions.addCoverPage ?? true);
  const [addPageNumbers, setAddPageNumbers] = useState(initialOptions.addPageNumbers ?? true);
  const [optimizePdf, setOptimizePdf] = useState(initialOptions.optimizePdf ?? true);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setAddCoverPage(initialOptions.addCoverPage ?? true);
    setAddPageNumbers(initialOptions.addPageNumbers ?? true);
    setOptimizePdf(initialOptions.optimizePdf ?? true);
  }, [open, initialOptions.addCoverPage, initialOptions.addPageNumbers, initialOptions.optimizePdf]);

  const nothingSelected = !addCoverPage && !addPageNumbers && !optimizePdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <PdfProcessingOptions
          addCoverPage={addCoverPage}
          onAddCoverPageChange={setAddCoverPage}
          addPageNumbers={addPageNumbers}
          onAddPageNumbersChange={setAddPageNumbers}
          optimizePdf={optimizePdf}
          onOptimizePdfChange={setOptimizePdf}
        />

        {isSubmitting && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{progressLabel || 'Processing PDF...'}</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${Math.max(8, progressValue)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting || nothingSelected}
            onClick={() => {
              onSubmit({ addCoverPage, addPageNumbers, optimizePdf });
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}