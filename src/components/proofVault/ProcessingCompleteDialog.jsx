import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, FolderOpen } from 'lucide-react';

export default function ProcessingCompleteDialog({
  open,
  onOpenChange,
  title,
  message,
  fileNames = [],
  folderUrl = '',
  folderPath = '',
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        {fileNames.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">Files</div>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1 text-sm text-slate-600">
              {fileNames.map((fileName) => (
                <div key={fileName} className="truncate">• {fileName}</div>
              ))}
            </div>
          </div>
        )}

        {folderUrl && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-blue-900">
              <FolderOpen className="h-4 w-4" />
              Dropbox save folder
            </div>
            <div className="truncate text-xs text-blue-700">{folderPath || folderUrl}</div>
            <div className="mt-1 text-[11px] text-blue-700/80">Desktop file explorer cannot be opened directly from the browser.</div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {folderUrl && (
            <Button asChild variant="outline">
              <a href={folderUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Dropbox folder
              </a>
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} className="bg-blue-600 hover:bg-blue-700">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}