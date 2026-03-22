import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ExportQuestionsDialog({ open, onOpenChange, title, description, content, fileName }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content || '');
  };

  const handleDownload = () => {
    const blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'exam-builder-v2-export.txt';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-slate-200 bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>{title || 'Export Questions'}</DialogTitle>
          <DialogDescription className="text-slate-500">{description || 'Copy or download this plain-text export.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            readOnly
            value={content || ''}
            className="h-[60vh] w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={handleCopy}>Copy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleDownload}>Download .txt</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}