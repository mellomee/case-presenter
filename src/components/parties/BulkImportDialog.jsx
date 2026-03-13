import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

export default function BulkImportDialog({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: {
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            side: { type: 'string' },
            role_id: { type: 'string' },
            credentials: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
          },
          required: ['first_name', 'last_name', 'side'],
        },
      });

      if (result.status !== 'success') {
        throw new Error(result.details || 'Failed to extract data');
      }

      const rows = Array.isArray(result.output) ? result.output : [result.output];
      const validRows = rows.filter(
        (r) => r.first_name && r.last_name && ['Plaintiff', 'Defense', 'Neutral'].includes(r.side)
      );

      if (validRows.length === 0) {
        throw new Error('No valid rows found in file');
      }

      await base44.entities.Party.bulkCreate(validRows);
      return { count: validRows.length };
    },
    onSuccess: (data) => {
      setError('');
      setFile(null);
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || 'Import failed');
    },
  });

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    setLoading(true);
    importMutation.mutate(file);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Parties</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Required columns:</strong> first_name, last_name, side
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Optional: role_id, credentials (comma-separated), notes
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Side must be: Plaintiff, Defense, or Neutral
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">
                {file ? file.name : 'Click to select Excel or CSV file'}
              </p>
              <p className="text-xs text-slate-500">(.xlsx, .xls, or .csv)</p>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}