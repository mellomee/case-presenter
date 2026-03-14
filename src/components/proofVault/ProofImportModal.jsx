import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';

export default function ProofImportModal({ open, onClose, onImportComplete }) {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setParsing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            proof_category: { type: 'string' },
            file_type: { type: 'string' },
            name: { type: 'string' },
            formal_name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            draft_exhibit_num: { type: 'string' },
          },
        },
      });
      if (result.status !== 'success' || !Array.isArray(result.output)) {
        setError('Failed to parse file. Ensure it matches the template.');
        return;
      }
      const rows = result.output.filter(r => r.name && r.proof_category && r.file_type);
      if (rows.length === 0) { setError('No valid rows found. Required: name, proof_category, file_type'); return; }
      setPreview(rows);
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
      const proofs = preview.map(r => ({
        proof_category: r.proof_category || 'Exhibit',
        file_type: r.file_type || 'PDF',
        name: r.name?.toString().trim(),
        formal_name: r.formal_name?.toString().trim() || r.name?.toString().trim(),
        description: r.description?.toString().trim() || '',
        status: ['Draft','Joint','Admitted','Demonstrative'].includes(r.status) ? r.status : 'Draft',
        draft_exhibit_num: r.draft_exhibit_num?.toString().trim() || '',
      }));
      await base44.entities.Proof.bulkCreate(proofs);
      onImportComplete?.();
      reset();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setPreview(null); setError(null); };

  const downloadTemplate = () => {
    const csv = `proof_category,file_type,name,formal_name,description,status,draft_exhibit_num\nExhibit,PDF,Medical Records,Plaintiff Medical Records 2023,Dr. Smith records,Draft,P-1\nExhibit,Image,Photo of Scene,Accident Scene Photo,,Draft,P-2\nDeposition,Video,Dr. Smith Depo,Deposition of Dr. Smith,,Draft,`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'proof_import_template.csv';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Proofs from Excel / CSV</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              {parsing ? (
                <><Loader className="w-8 h-8 mx-auto text-slate-400 mb-2 animate-spin" /><p className="text-sm text-slate-600">Parsing…</p></>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" id="proof-file-input" />
                  <label htmlFor="proof-file-input" className="cursor-pointer text-blue-600 hover:underline">Click to upload</label>
                  <p className="text-xs text-slate-500 mt-1">XLSX, XLS, or CSV</p>
                </>
              )}
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2"><AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}
            <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2"><Download className="w-4 h-4" /> Download Template</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div><p className="font-medium text-green-900">{preview.length} proofs ready to import</p></div>
            </div>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    {['Category','Type','Name','Formal Name','Status','Draft #'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 12).map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-1.5">{r.proof_category}</td>
                      <td className="px-3 py-1.5">{r.file_type}</td>
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-3 py-1.5">{r.formal_name || '—'}</td>
                      <td className="px-3 py-1.5">{r.status || 'Draft'}</td>
                      <td className="px-3 py-1.5">{r.draft_exhibit_num || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 12 && <p className="text-xs text-slate-500 px-3 py-2">…and {preview.length - 12} more</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700">
                {importing ? 'Importing…' : `Import ${preview.length} Proofs`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}