import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function PartyImportModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setError(null);
    setParsing(true);

    try {
      const fileUrl = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      const partySchema = {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          side: { type: 'string' },
          role: { type: 'string' },
          credentials: { type: 'string' },
        },
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl.file_url,
        json_schema: partySchema,
      });

      if (result.status !== 'success' || !Array.isArray(result.output)) {
        setError('Failed to parse Excel file');
        setParsing(false);
        return;
      }

      const rows = result.output;
      if (rows.length === 0) {
        setError('Excel file has no data rows');
        setParsing(false);
        return;
      }

      const hasRequiredFields = rows.every((r) => r.first_name && r.last_name && r.side);
      if (!hasRequiredFields) {
        setError('Some rows missing required fields: first_name, last_name, side');
        setParsing(false);
        return;
      }

      setFile(selectedFile);
      setPreview({ rows, total: rows.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setImporting(true);
    try {
      const roles = await base44.entities.Role.list();
      const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));

      const parties = preview.rows.map((row) => ({
        first_name: row.first_name?.toString().trim() || '',
        last_name: row.last_name?.toString().trim() || '',
        side: row.side?.toString().trim() || '',
        role_id: row.role ? roleMap[row.role?.toString().trim()] || null : null,
        credentials: row.credentials ? JSON.parse(row.credentials) : [],
      }));

      const validParties = parties.filter((p) => p.first_name && p.last_name && ['Plaintiff', 'Defense', 'Neutral'].includes(p.side));

      if (validParties.length === 0) {
        setError('No valid parties to import');
        setImporting(false);
        return;
      }

      await base44.entities.Party.bulkCreate(validParties);
      onImportComplete();
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateCSV = `first_name,last_name,side,role,credentials
Jane,Smith,Plaintiff,Expert Witness,"MD, PhD"
John,Doe,Defense,Expert Witness,CPA
Sarah,Johnson,Plaintiff,Fact Witness,`;

    const blob = new Blob([templateCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'party_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Parties from Excel</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Excel File</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                {parsing ? (
                  <>
                    <Loader className="w-8 h-8 mx-auto text-slate-400 mb-2 animate-spin" />
                    <p className="text-sm text-slate-600">Parsing file...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                      disabled={parsing}
                    />
                    <label htmlFor="file-input" className="cursor-pointer">
                      <span className="text-blue-600 hover:underline">Click to upload</span>
                      {' or drag and drop'}
                    </label>
                    <p className="text-xs text-slate-500 mt-2">XLSX, XLS, or CSV</p>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
              Download Excel Template
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">{preview.total} parties found</p>
                <p className="text-sm text-green-800">Ready to import</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-slate-900">Preview:</h4>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">First Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Last Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Side</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-2">{row.first_name}</td>
                        <td className="px-3 py-2">{row.last_name}</td>
                        <td className="px-3 py-2">{row.side}</td>
                        <td className="px-3 py-2">{row.role || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.total > 10 && (
                <p className="text-xs text-slate-600">...and {preview.total - 10} more</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setPreview(null); setFile(null); }}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700">
                {importing ? 'Importing...' : 'Import All'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}