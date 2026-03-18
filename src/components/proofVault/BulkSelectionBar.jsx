import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BulkSelectionBar({
  selectedCount = 0,
  visibleCount = 0,
  isDeleting = false,
  onSelectAll,
  onClear,
  onDelete,
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-700">
        {selectedCount > 0 ? `${selectedCount} selected` : `0 selected`} · {visibleCount} visible
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onSelectAll} disabled={visibleCount === 0 || isDeleting}>
          Select all
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClear} disabled={selectedCount === 0 || isDeleting}>
          Clear
        </Button>
        <Button type="button" size="sm" className="bg-red-600 hover:bg-red-700" onClick={onDelete} disabled={selectedCount === 0 || isDeleting}>
          <Trash2 className="w-4 h-4" />
          {isDeleting ? 'Deleting…' : 'Delete selected'}
        </Button>
      </div>
    </div>
  );
}