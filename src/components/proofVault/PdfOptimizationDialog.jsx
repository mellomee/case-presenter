import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import PdfProcessingOptions from '@/components/proofVault/PdfProcessingOptions.jsx';

export default function PdfOptimizationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isSubmitting = false,
  initialOptions = { addCoverPage: true, addPageNumbers: true, optimizePdf: true },
  onSubmit,
}) {
  const [addCoverPage, setAddCoverPage] = useState(initialOptions.addCoverPage ?? true);
  const [addPageNumbers, setAddPageNumbers] = useState(initialOptions.addPageNumbers ?? true);
  const [optimizePdf, setOptimizePdf] = useState(initialOptions.optimizePdf ?? true);

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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting || nothingSelected}
            onClick={() => onSubmit({ addCoverPage, addPageNumbers, optimizePdf })}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Working…</> : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}