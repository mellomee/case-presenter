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
      <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Question Group</DialogTitle>
          <DialogDescription className="text-slate-400">Rename this question group.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value.slice(0, 24))}
            placeholder="No Warn"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { onSave({ label: label.trim() }); onOpenChange(false); }}>Save Group</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}