import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function GroupEditorDialog({ open, onOpenChange, onSave, initialLabel = '' }) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    setLabel(initialLabel);
  }, [initialLabel, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle>Question Group</DialogTitle>
          <DialogDescription className="text-slate-500">Rename this question group.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value.slice(0, 24))}
            placeholder="No Warn"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { onSave({ label: label.trim() }); onOpenChange(false); }}>Save Group</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}