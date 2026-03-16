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
            proof_type_category_id: { type: 'string' },
            category_id: { type: 'string' },
            party_id: { type: 'string' },
            file_source: { type: 'string' },
            file_url: { type: 'string' },
            video_url: { type: 'string' },
            dropbox_file_id: { type: 'string' },
            dropbox_path: { type: 'string' },
            dropbox_file_name: { type: 'string' },
          },
        },
      });
      if (result.status !== 'success' || !Array.isArray(result.output)) {
        setError('Failed to parse file. Ensure it matches the template.');
        return;
      }
      const rows = result.output.filter(r => r.name && r.proof_category && r.file_type && r.proof_type_category_id);
      if (rows.length === 0) { setError('No valid rows found. Required: name, proof_category, file_type, proof_type_category_id'); return; }
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
      const proofs = [];

      for (let index = 0; index < preview.length; index += 1) {
        const r = preview[index];
        const proofCategory = r.proof_category || 'Exhibit';
        const fileType = r.file_type || 'PDF';
        const status = ['Draft', 'Joint', 'Admitted', 'Demonstrative'].includes(r.status) ? r.status : 'Draft';
        const name = r.name?.toString().trim();
        const formalName = r.formal_name?.toString().trim() || '';
        const fileSource = r.file_source?.toString().trim() === 'dropbox' ? 'dropbox' : 'base44';

        if (!name) throw new Error(`Row ${index + 1}: Internal Name is required.`);
        if (!r.proof_type_category_id?.toString().trim()) throw new Error(`Row ${index + 1}: proof_type_category_id is required.`);
        if (proofCategory === 'Deposition' && !r.party_id?.toString().trim()) throw new Error(`Row ${index + 1}: party_id is required for depositions.`);
        if (proofCategory === 'Exhibit' && status !== 'Draft' && !formalName) throw new Error(`Row ${index + 1}: Formal Name is required when status is not Draft.`);

        let proof = {
          proof_category: proofCategory,
          file_type: fileType,
          name,
          formal_name: formalName,
          description: r.description?.toString().trim() || '',
          status,
          draft_exhibit_num: r.draft_exhibit_num?.toString().trim() || '',
          proof_type_category_id: r.proof_type_category_id?.toString().trim(),
          category_id: r.category_id?.toString().trim() || '',
          party_id: r.party_id?.toString().trim() || '',
        };

        if (fileSource === 'dropbox') {
          const dropboxFileId = r.dropbox_file_id?.toString().trim() || '';
          const dropboxPath = r.dropbox_path?.toString().trim() || '';
          const dropboxFileName = r.dropbox_file_name?.toString().trim() || name;

          if (!dropboxFileId && !dropboxPath) {
            throw new Error(`Row ${index + 1}: Dropbox rows need dropbox_file_id or dropbox_path.`);
          }

          if (fileType === 'PDF') {
            const response = await base44.functions.invoke('prepareDropboxProof', {
              fileId: dropboxFileId || undefined,
              path: dropboxPath || undefined,
              name: dropboxFileName,
            });

            proof = {
              ...proof,
              ...response.data,
              file_url: '',
              video_url: '',
            };
          } else {
            proof = {
              ...proof,
              file_source: 'dropbox',
              dropbox_file_id: dropboxFileId,
              dropbox_path: dropboxPath,
              dropbox_file_name: dropboxFileName,
              file_url: '',
              video_url: '',
            };
          }
        } else {
          proof = {
            ...proof,
            file_source: 'base44',
            file_url: r.file_url?.toString().trim() || '',
            video_url: r.video_url?.toString().trim() || '',
            dropbox_file_id: '',
            dropbox_path: '',
            dropbox_file_name: '',
          };
        }

        proofs.push(proof);
      }

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
    const csv = `proof_category,file_type,name,formal_name,description,status,draft_exhibit_num,proof_type_category_id,category_id,party_id,file_source,file_url,video_url,dropbox_file_id,dropbox_path,dropbox_file_name\nExhibit,PDF,Medical Records,,Imported medical records,Draft,P-1,proofTypeId123,categoryId123,,base44,,,,,\nExhibit,PDF,Glazek Warning Article,,Linked from Dropbox,Draft,3234,proofTypeId123,categoryId123,,dropbox,,,,/PracticePanther/Lisa Chan/Trial/Mels Trial Prep/Exhibits/10 - Dr. Kuba Glazek - Article Whats a Warning and When Will it Work.pdf,10 - Dr. Kuba Glazek - Article Whats a Warning and When Will it Work.pdf\nDeposition,Video,Dr. Smith Depo,Deposition of Dr. Smith,,Draft,,proofTypeId123,,partyId123,base44,,https://example.com/deposition.mp4,,,
`;
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p><strong>Required:</strong> name, proof_category, file_type, proof_type_category_id</p>
              <p><strong>Formal Name:</strong> optional for Draft, required for Joint / Admitted / Demonstrative exhibits</p>
              <p><strong>Dropbox rows:</strong> set file_source to dropbox and include dropbox_file_id or dropbox_path</p>
              <p><strong>Depositions:</strong> party_id is required</p>
            </div>
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
                    {['Category','Type','Internal Name','Formal Name','Source','Status'].map(h => (
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
                      <td className="px-3 py-1.5">{r.file_source || 'base44'}</td>
                      <td className="px-3 py-1.5">{r.status || 'Draft'}</td>
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