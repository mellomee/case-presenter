import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertTriangle, RotateCcw, Download, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PdfOptimizationResultDialog({
  open,
  onOpenChange,
  results = [],
  onRetryAll,
  onRetrySelected,
  isRetrying = false,
}) {
  const [selectedForRetry, setSelectedForRetry] = useState(new Set());

  if (!results.length) return null;

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const canRetry = failureCount > 0;

  const toggleRetrySelection = (proofId) => {
    const next = new Set(selectedForRetry);
    if (next.has(proofId)) {
      next.delete(proofId);
    } else {
      next.add(proofId);
    }
    setSelectedForRetry(next);
  };

  const handleRetrySelected = async () => {
    if (selectedForRetry.size > 0) {
      await onRetrySelected(Array.from(selectedForRetry));
      setSelectedForRetry(new Set());
    }
  };

  const failedResults = results.filter((r) => !r.success);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>PDF Optimization Results</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-center">
            <div className="text-sm text-slate-600">Completed</div>
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-600">Failed</div>
            <div className="text-2xl font-bold text-red-600">{failureCount}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-2xl font-bold text-slate-800">{results.length}</div>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="text-left">Proof Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Cover Page</TableHead>
                <TableHead className="text-center">Page Numbers</TableHead>
                <TableHead className="text-left flex-1">Error / Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.proofId} className={!result.success ? 'bg-red-50' : ''}>
                  <TableCell className="text-center">
                    {!result.success && (
                      <input
                        type="checkbox"
                        checked={selectedForRetry.has(result.proofId)}
                        onChange={() => toggleRetrySelection(result.proofId)}
                        className="rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{result.proofName}</TableCell>
                  <TableCell className="text-center">
                    {result.success ? (
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-700">Success</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-red-700">Failed</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.success && (
                      <div className="text-sm font-semibold">
                        {result.optimized_with_cover_page ? (
                          <span className="text-green-700">✓ Yes</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.success && (
                      <div className="text-sm font-semibold">
                        {result.optimized_with_page_numbers ? (
                          <span className="text-green-700">✓ Yes</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">
                    {result.success ? (
                      <span className="text-green-700">Saved to Dropbox</span>
                    ) : (
                      <span className="text-red-700 font-medium">{result.error}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {canRetry && selectedForRetry.size > 0 && (
              <span className="text-xs text-slate-600">
                {selectedForRetry.size} proof{selectedForRetry.size === 1 ? '' : 's'} selected for retry
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canRetry && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRetrySelected}
                  disabled={selectedForRetry.size === 0 || isRetrying}
                  className="gap-2"
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Retry Selected
                </Button>
                <Button
                  onClick={onRetryAll}
                  disabled={isRetrying}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Retry All Failed
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}