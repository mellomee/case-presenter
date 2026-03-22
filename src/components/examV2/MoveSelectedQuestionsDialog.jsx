import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function MoveSelectedQuestionsDialog({ open, onOpenChange, count = 0, destinations = [], onMove }) {
  const [destinationId, setDestinationId] = useState('');

  useEffect(() => {
    if (!open) return;
    setDestinationId(destinations[0]?.id || '');
  }, [destinations, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-slate-200 bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Move Selected Questions</DialogTitle>
          <DialogDescription className="text-slate-500">Move {count} selected question{count === 1 ? '' : 's'} into another exam section.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <select
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300"
          >
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>{destination.label}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!destinationId || count === 0 || destinations.length === 0}
              onClick={async () => {
                await onMove(destinationId);
                onOpenChange(false);
              }}
            >
              Move Questions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}