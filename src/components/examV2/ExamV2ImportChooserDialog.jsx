import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText, Upload } from 'lucide-react';

export default function ExamV2ImportChooserDialog({ open, onOpenChange, onChooseExcel, onChooseText }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle>Import into Exam Builder V2</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onChooseExcel}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Import from Excel</p>
            <p className="mt-1 text-sm text-slate-600">Upload your spreadsheet using the existing V2 Excel template.</p>
          </button>

          <button
            type="button"
            onClick={onChooseText}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Import from text</p>
            <p className="mt-1 text-sm text-slate-600">Paste structured text and turn it into proof sections or question groups.</p>
          </button>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => onOpenChange(false)}>
            Close
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}