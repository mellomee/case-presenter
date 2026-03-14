import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader, Download, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Master bulk import for Trial Points + Buckets + Questions.
 *
 * Required columns:  bucket_name, exam_type, question_text
 * Optional columns:  trial_point_name, party_first_name, party_last_name,
 *                    expected_answer, notes, sort_order
 *
 * - trial_point_name  → auto-created if new
 * - bucket_name       → matched by name+party+exam_type, created if new
 * - party             → matched by first+last name (must already exist)
 */
export default function TrialDataImportModal({ open, onClose, onImportComplete, parties = [], trialPoints = [] }) {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null); // { valid, errors }
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const reset = () => { setPreview(null); setError(null); setExpanded({}); };

  // ── Template download ──────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const csv = [
      'trial_point_name,bucket_name,exam_type,party_first_name,party_last_name,question_text,expected_answer,notes,sort_order',
      'Liability,Background,Direct,Jane,Doe,Please state your full name.,Jane Doe,,1',
      'Liability,Background,Direct,Jane,Doe,Where were you on the date of the incident?,,Check calendar,2',
      'Damages,Medical,Direct,Jane,Doe,Can you describe your injuries?,Broken arm,,1',
      ',Employment History,Cross,John,Smith,You were fired from your previous job?,Correct,,1',
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'trial_data_import_template.csv';
    a.click();
  };

  // ── File parse ─────────────────────────────────────────────────────────────
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
            trial_point_name:  { type: 'string' },
            bucket_name:       { type: 'string' },
            exam_type:         { type: 'string' },
            party_first_name:  { type: 'string' },
            party_last_name:   { type: 'string' },
            question_text:     { type: 'string' },
            expected_answer:   { type: 'string' },
            notes:             { type: 'string' },
            sort_order:        { type: 'number' },
          },
        },
      });

      if (result.status !== 'success' || !Array.isArray(result.output)) {
        setError('Failed to parse file. Ensure it matches the template columns.');
        return;
      }

      // Validate rows
      const valid = [];
      const errors = [];
      result.output.forEach((row, idx) => {
        const rowNum = idx + 2; // 1-indexed + header row
        const rowErrors = [];

        if (!row.bucket_name?.trim()) rowErrors.push('bucket_name is required');
        if (!row.question_text?.trim()) rowErrors.push('question_text is required');
        const et = row.exam_type?.trim();
        if (!et || !['Direct', 'Cross'].includes(et)) rowErrors.push('exam_type must be "Direct" or "Cross"');

        // Party lookup
        let party = null;
        if (row.party_first_name || row.party_last_name) {
          party = parties.find(p =>
            p.first_name?.toLowerCase() === row.party_first_name?.toLowerCase()?.trim() &&
            p.last_name?.toLowerCase() === row.party_last_name?.toLowerCase()?.trim()
          );
          if (!party) rowErrors.push(`Party "${row.party_first_name} ${row.party_last_name}" not found`);
        }

        if (rowErrors.length > 0) {
          errors.push({ rowNum, row, errors: rowErrors });
        } else {
          valid.push({ ...row, _party: party });
        }
      });

      if (valid.length === 0 && errors.length === 0) {
        setError('File appears empty or has no data rows.');
        return;
      }

      setPreview({ valid, errors });
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!preview?.valid?.length) return;
    setImporting(true);
    try {
      // Fetch existing trial points & buckets
      const allTP = await base44.entities.TrialPoint.list();
      const allBuckets = await base44.entities.Bucket.list();

      const tpMap = Object.fromEntries(allTP.map(tp => [tp.name.toLowerCase(), tp.id]));
      const bucketMap = {}; // key: `${bucket_name}|${party_id}|${exam_type}`
      allBuckets.forEach(b => {
        bucketMap[`${b.name.toLowerCase()}|${b.party_id}|${b.exam_type}`] = b.id;
      });

      let tpSortBase = allTP.length;
      let bucketSortBase = allBuckets.length;

      for (const row of preview.valid) {
        // 1. Trial Point
        let tpId = null;
        if (row.trial_point_name?.trim()) {
          const tpKey = row.trial_point_name.trim().toLowerCase();
          if (!tpMap[tpKey]) {
            const created = await base44.entities.TrialPoint.create({
              name: row.trial_point_name.trim(),
              sort_order: tpSortBase++,
            });
            tpMap[tpKey] = created.id;
          }
          tpId = tpMap[tpKey];
        }

        // 2. Bucket
        const partyId = row._party?.id || '';
        const examType = row.exam_type.trim();
        const bucketKey = `${row.bucket_name.trim().toLowerCase()}|${partyId}|${examType}`;
        if (!bucketMap[bucketKey]) {
          const created = await base44.entities.Bucket.create({
            name: row.bucket_name.trim(),
            party_id: partyId,
            exam_type: examType,
            trial_point_id: tpId || undefined,
            sort_order: bucketSortBase++,
          });
          bucketMap[bucketKey] = created.id;
        }
        const bucketId = bucketMap[bucketKey];

        // 3. Question (bulk at end is better, but sequential is fine here)
        await base44.entities.Question.create({
          text: row.question_text.trim(),
          expected_answer: row.expected_answer?.trim() || '',
          notes: row.notes?.trim() || '',
          type: examType,
          party_id: partyId,
          bucket_id: bucketId,
          sort_order: row.sort_order ?? 0,
          block_type: 'Question',
        });
      }

      onImportComplete?.();
      reset();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  // ── Group valid rows for preview ───────────────────────────────────────────
  const grouped = preview?.valid.reduce((acc, r) => {
    const tpKey = r.trial_point_name?.trim() || '(No Trial Point)';
    const bucketKey = `${r.bucket_name?.trim()} [${r.exam_type}] ${r._party ? `— ${r._party.first_name} ${r._party.last_name}` : ''}`;
    if (!acc[tpKey]) acc[tpKey] = {};
    if (!acc[tpKey][bucketKey]) acc[tpKey][bucketKey] = [];
    acc[tpKey][bucketKey].push(r);
    return acc;
  }, {}) || {};

  const toggleExpand = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import — Trial Points, Buckets & Questions</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload an Excel or CSV file. Required columns:{' '}
              <code className="bg-slate-100 px-1 rounded text-xs">bucket_name</code>,{' '}
              <code className="bg-slate-100 px-1 rounded text-xs">exam_type</code>,{' '}
              <code className="bg-slate-100 px-1 rounded text-xs">question_text</code>.
              Optional: <code className="bg-slate-100 px-1 rounded text-xs">trial_point_name</code>,{' '}
              <code className="bg-slate-100 px-1 rounded text-xs">party_first_name</code>,{' '}
              <code className="bg-slate-100 px-1 rounded text-xs">party_last_name</code>, expected_answer, notes, sort_order.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              {parsing ? (
                <><Loader className="w-8 h-8 mx-auto text-slate-400 mb-2 animate-spin" /><p className="text-sm text-slate-600">Parsing file…</p></>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" id="trial-import-file" />
                  <label htmlFor="trial-import-file" className="cursor-pointer text-blue-600 hover:underline font-medium">Click to upload</label>
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

            <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2">
              <Download className="w-4 h-4" /> Download Template
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{preview.valid.length}</p>
                <p className="text-xs text-green-600">Valid rows</p>
              </div>
              <div className={`border rounded-lg p-3 text-center ${preview.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-2xl font-bold ${preview.errors.length > 0 ? 'text-red-700' : 'text-slate-400'}`}>{preview.errors.length}</p>
                <p className={`text-xs ${preview.errors.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>Errors (skipped)</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{Object.keys(grouped).length}</p>
                <p className="text-xs text-blue-600">Trial Points</p>
              </div>
            </div>

            {/* Error report */}
            {preview.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"
                  onClick={() => toggleExpand('errors')}
                >
                  <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {preview.errors.length} Error Rows (will be skipped)</span>
                  {expanded['errors'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expanded['errors'] && (
                  <div className="divide-y divide-red-100 max-h-40 overflow-y-auto">
                    {preview.errors.map(({ rowNum, row, errors: errs }) => (
                      <div key={rowNum} className="px-3 py-2">
                        <p className="text-xs font-semibold text-red-700">Row {rowNum}: {row.question_text?.slice(0, 40) || '—'}</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {errs.map((e, i) => <li key={i} className="text-xs text-red-600">• {e}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Valid rows preview */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {Object.entries(grouped).map(([tpName, buckets]) => (
                <div key={tpName} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left"
                    onClick={() => toggleExpand(tpName)}
                  >
                    <span className="text-sm font-semibold text-slate-700">{tpName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{Object.values(buckets).flat().length} questions</span>
                      {expanded[tpName] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>
                  {expanded[tpName] && (
                    <div className="divide-y divide-slate-100">
                      {Object.entries(buckets).map(([bucketLabel, qs]) => (
                        <div key={bucketLabel} className="px-3 py-2">
                          <p className="text-xs font-semibold text-blue-700 mb-1">{bucketLabel} ({qs.length})</p>
                          <ul className="space-y-0.5">
                            {qs.slice(0, 4).map((q, i) => (
                              <li key={i} className="text-xs text-slate-600 truncate">• {q.question_text}</li>
                            ))}
                            {qs.length > 4 && <li className="text-xs text-slate-400">…and {qs.length - 4} more</li>}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={reset} disabled={importing}>Back</Button>
              <Button onClick={handleImport} disabled={importing || preview.valid.length === 0} className="bg-blue-600 hover:bg-blue-700">
                {importing ? <><Loader className="w-4 h-4 animate-spin mr-1.5" />Importing…</> : `Import ${preview.valid.length} Questions`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}