import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FolderOpen } from 'lucide-react';

function OptionButton({ icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-slate-100 p-3">
          <Icon className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function ProofImportSourceModal({ open, onClose, onSelectExcel, onSelectDropbox }) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Proofs</DialogTitle>
          <DialogDescription>Choose how you want to bring files into Proof Vault.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <OptionButton
            icon={FolderOpen}
            title="Bulk link Dropbox files"
            description="Select multiple Dropbox files, save their Dropbox IDs, then edit the imported proofs with the details you need."
            onClick={onSelectDropbox}
          />
          <OptionButton
            icon={FileSpreadsheet}
            title="Excel template import"
            description="Keep the spreadsheet import flow for structured bulk imports."
            onClick={onSelectExcel}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}