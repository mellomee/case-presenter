import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';

function normalizeValue(value) {
  return value?.toString().trim() || '';
}

function parseCredentialInput(value) {
  const raw = normalizeValue(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((item) => normalizeValue(item)).filter(Boolean);
  } catch {}

  return raw.split(',').map((item) => normalizeValue(item)).filter(Boolean);
}

function buildReferenceRows(roles, credentials) {
  return [
    ['Type', 'Value', 'ID / Notes'],
    ['Side', 'Plaintiff', 'Allowed value'],
    ['Side', 'Defense', 'Allowed value'],
    ['Side', 'Neutral', 'Allowed value'],
    ...roles.map((role) => ['Role', role.name || '', role.id || '']),
    ...credentials.map((credential) => ['Credential', credential.name || '', credential.id || '']),
  ];
}

export default function PartyImportModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: isOpen,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.Credential.list(),
    enabled: isOpen,
  });

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
      const allRoles = await base44.entities.Role.list();
      const allCredentials = await base44.entities.Credential.list();

      const roleIdMap = Object.fromEntries(allRoles.map((item) => [item.id, item.id]));
      const roleNameMap = Object.fromEntries(allRoles.map((item) => [normalizeValue(item.name).toLowerCase(), item.id]));
      const credentialIdMap = Object.fromEntries(allCredentials.map((item) => [item.id, item.id]));
      const credentialNameMap = Object.fromEntries(allCredentials.map((item) => [normalizeValue(item.name).toLowerCase(), item.id]));

      const parties = preview.rows.map((row) => {
        const roleValue = normalizeValue(row.role);
        const credentialValues = parseCredentialInput(row.credentials);

        return {
          first_name: normalizeValue(row.first_name),
          last_name: normalizeValue(row.last_name),
          side: normalizeValue(row.side),
          role_id: roleValue ? roleIdMap[roleValue] || roleNameMap[roleValue.toLowerCase()] || null : null,
          credentials: {
            ids: credentialValues
              .map((value) => credentialIdMap[value] || credentialNameMap[value.toLowerCase()] || null)
              .filter(Boolean),
          },
        };
      });

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
    const workbook = XLSX.utils.book_new();

    const templateRows = [
      ['first_name', 'last_name', 'side', 'role', 'credentials'],
      ['Jane', 'Smith', 'Plaintiff', roles[0]?.name || '', credentials.slice(0, 2).map((item) => item.name).join(', ')],
      ['John', 'Doe', 'Defense', roles[1]?.name || roles[0]?.name || '', credentials[2]?.name || credentials[0]?.name || ''],
      ['Sarah', 'Johnson', 'Neutral', '', ''],
    ];

    const referenceRows = buildReferenceRows(roles, credentials);

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(templateRows), 'Template');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(referenceRows), 'Reference');

    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    link.download = 'party_import_template.xlsx';
    link.click();
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
              <p><strong>Required for every row:</strong> <code>first_name</code>, <code>last_name</code>, <code>side</code></p>
              <p><strong>Optional:</strong> <code>role</code>, <code>credentials</code></p>
              <p><strong>Dropdown options list:</strong> <code>side</code> must be <code>Plaintiff</code>, <code>Defense</code>, or <code>Neutral</code></p>
              <p><strong>Reference sheet:</strong> the downloaded template includes a separate <code>Reference</code> sheet with valid <code>role</code> and <code>credential</code> options. You can use names or IDs for roles, and credential names separated by commas.</p>
            </div>

            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
              Download Template with Reference Sheet
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