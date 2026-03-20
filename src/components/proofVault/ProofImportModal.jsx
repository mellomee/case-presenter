import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';

function normalizeValue(value) {
  return value?.toString().trim() || '';
}

function partyDisplayName(party) {
  return [party.first_name, party.last_name].filter(Boolean).join(' ').trim();
}

function resolveLookupId(rawValue, records, getName, label, rowNumber, required = false) {
  const value = normalizeValue(rawValue);
  if (!value) {
    if (required) throw new Error(`Row ${rowNumber}: ${label} is required.`);
    return '';
  }

  const byId = records.find((record) => record.id === value);
  if (byId) return byId.id;

  const lowerValue = value.toLowerCase();
  const byName = records.find((record) => getName(record).toLowerCase() === lowerValue);
  if (byName) return byName.id;

  throw new Error(`Row ${rowNumber}: Could not match ${label} "${value}". Use a valid name or ID from the template reference sheet.`);
}

function buildReferenceRows(proofTypeCategories, categories, parties) {
  const rows = [['Type', 'Name', 'ID']];

  proofTypeCategories.forEach((item) => rows.push(['Proof Type Category', item.name || '', item.id || '']));
  categories.forEach((item) => rows.push(['Category', item.name || '', item.id || '']));
  parties.forEach((item) => rows.push(['Party', partyDisplayName(item), item.id || '']));

  return rows;
}

export default function ProofImportModal({ open, onClose, onImportComplete }) {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const { data: proofTypeCategories = [] } = useQuery({
    queryKey: ['proofTypeCategories'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

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

      const rows = result.output.filter((row) => row.name && row.proof_category && row.file_type && row.proof_type_category_id);
      if (rows.length === 0) {
        setError('No valid rows found. Required: name, proof_category, file_type, proof_type_category_id (name or ID).');
        return;
      }

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
        const row = preview[index];
        const rowNumber = index + 1;
        const proofCategory = row.proof_category || 'Exhibit';
        const fileType = row.file_type || 'PDF';
        const status = ['Draft', 'Joint', 'Admitted', 'Demonstrative'].includes(row.status) ? row.status : 'Draft';
        const name = normalizeValue(row.name);
        const formalName = normalizeValue(row.formal_name);
        const fileSource = normalizeValue(row.file_source) === 'dropbox' ? 'dropbox' : 'base44';

        if (!name) throw new Error(`Row ${rowNumber}: Internal Name is required.`);
        if (proofCategory === 'Exhibit' && status !== 'Draft' && !formalName) {
          throw new Error(`Row ${rowNumber}: Formal Name is required when status is not Draft.`);
        }

        const proofTypeCategoryId = resolveLookupId(
          row.proof_type_category_id,
          proofTypeCategories,
          (item) => item.name || '',
          'proof_type_category_id',
          rowNumber,
          true
        );

        const categoryId = resolveLookupId(
          row.category_id,
          categories,
          (item) => item.name || '',
          'category_id',
          rowNumber,
          false
        );

        const partyId = resolveLookupId(
          row.party_id,
          parties,
          (item) => partyDisplayName(item),
          'party_id',
          rowNumber,
          false
        );

        let proof = {
          proof_category: proofCategory,
          file_type: fileType,
          name,
          formal_name: formalName,
          description: normalizeValue(row.description),
          status,
          draft_exhibit_num: normalizeValue(row.draft_exhibit_num),
          proof_type_category_id: proofTypeCategoryId,
          category_id: categoryId,
          party_id: partyId || '',
          party_ids: partyId ? { ids: [partyId] } : null,
        };

        if (fileSource === 'dropbox') {
          const dropboxFileId = normalizeValue(row.dropbox_file_id);
          const dropboxPath = normalizeValue(row.dropbox_path);
          const dropboxFileName = normalizeValue(row.dropbox_file_name) || name;

          if (!dropboxFileId && !dropboxPath) {
            throw new Error(`Row ${rowNumber}: Dropbox rows need dropbox_file_id or dropbox_path.`);
          }

          if (fileType === 'PDF') {
            proof = {
              ...proof,
              file_source: 'dropbox',
              dropbox_file_id: dropboxFileId,
              dropbox_path: dropboxPath,
              dropbox_file_name: dropboxFileName,
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
            file_url: normalizeValue(row.file_url),
            video_url: normalizeValue(row.video_url),
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

  const reset = () => {
    setPreview(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    const templateRows = [
      [
        'proof_category',
        'file_type',
        'name',
        'formal_name',
        'description',
        'status',
        'draft_exhibit_num',
        'proof_type_category_id',
        'category_id',
        'party_id',
        'file_source',
        'file_url',
        'video_url',
        'dropbox_file_id',
        'dropbox_path',
        'dropbox_file_name',
      ],
      [
        'Exhibit',
        'PDF',
        'Medical Records',
        '',
        'Imported medical records',
        'Draft',
        'P-1',
        proofTypeCategories[0]?.name || '',
        categories[0]?.name || '',
        '',
        'base44',
        '',
        '',
        '',
        '',
        '',
      ],
      [
        'Exhibit',
        'PDF',
        'Dropbox Exhibit',
        '',
        'Linked from Dropbox',
        'Draft',
        '3234',
        proofTypeCategories[0]?.name || '',
        categories[0]?.name || '',
        '',
        'dropbox',
        '',
        '',
        '',
        '/your/dropbox/path/file.pdf',
        'file.pdf',
      ],
      [
        'Deposition',
        'Video',
        'Dr. Smith Depo',
        'Deposition of Dr. Smith',
        '',
        'Draft',
        '',
        proofTypeCategories[0]?.name || '',
        '',
        '',
        'base44',
        '',
        'https://example.com/deposition.mp4',
        '',
        '',
        '',
      ],
    ];

    const referenceRows = buildReferenceRows(proofTypeCategories, categories, parties);

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(templateRows), 'Template');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(referenceRows), 'Reference');

    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    link.download = 'proof_import_template.xlsx';
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Proofs from Excel / CSV</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              {parsing ? (
                <>
                  <Loader className="w-8 h-8 mx-auto text-slate-400 mb-2 animate-spin" />
                  <p className="text-sm text-slate-600">Parsing…</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" id="proof-file-input" />
                  <label htmlFor="proof-file-input" className="cursor-pointer text-blue-600 hover:underline">Click to upload</label>
                  <p className="text-xs text-slate-500 mt-1">XLSX, XLS, or CSV</p>
                </>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
              <p><strong>Required for every row:</strong> <code>name</code>, <code>proof_category</code>, <code>file_type</code>, <code>proof_type_category_id</code></p>
              <p><strong>Conditionally required:</strong> <code>formal_name</code> for Joint / Admitted / Demonstrative exhibits</p>
              <p><strong>Optional:</strong> <code>description</code>, <code>status</code>, <code>draft_exhibit_num</code>, <code>category_id</code>, <code>party_id</code>, <code>file_source</code>, <code>file_url</code>, <code>video_url</code>, <code>dropbox_file_id</code>, <code>dropbox_path</code>, <code>dropbox_file_name</code></p>
              <p><strong>Reference sheet:</strong> the downloaded template includes a separate <code>Reference</code> sheet with valid options for <code>proof_type_category_id</code>, <code>category_id</code>, and optional <code>party_id</code>. You can use either the name or the ID.</p>
              <p><strong>Dropbox rows:</strong> set <code>file_source</code> to <code>dropbox</code> and usually fill in <code>dropbox_path</code>. Leave <code>dropbox_file_id</code> blank unless you already know it.</p>
            </div>

            <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2">
              <Download className="w-4 h-4" /> Download Template with Reference Sheet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">{preview.length} proofs ready to import</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    {['Category', 'Type', 'Internal Name', 'Formal Name', 'Source', 'Status'].map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-semibold text-slate-700">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 12).map((row, index) => (
                    <tr key={index} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-1.5">{row.proof_category}</td>
                      <td className="px-3 py-1.5">{row.file_type}</td>
                      <td className="px-3 py-1.5">{row.name}</td>
                      <td className="px-3 py-1.5">{row.formal_name || '—'}</td>
                      <td className="px-3 py-1.5">{row.file_source || 'base44'}</td>
                      <td className="px-3 py-1.5">{row.status || 'Draft'}</td>
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