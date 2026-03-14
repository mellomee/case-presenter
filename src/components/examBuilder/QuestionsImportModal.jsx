import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';

/**
 * Imports Buckets + Questions from Excel for a given party + exam type.
 * Columns: bucket_name, question_text, expected_answer, notes, sort_order
 * New buckets are auto-created; existing buckets matched by name.
 */
export default function QuestionsImportModal({ open, onClose, onImportComplete, party, examType }) {
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
            bucket_name: { type: 'string' },
            question_text: { type: 'string' },
            expected_answer: { type: 'string' },
            notes: { type: 'string' },
            sort_order: { type: 'number' },
          },
        },
      });
      if (result.status !== 'success' || !Array.isArray(result.output)) {
        setError('Failed to parse file. Ensure it matches the template.');
        return;
      }
      const rows = result.output.filter(r => r.bucket_name && r.question_text);
      if (rows.length === 0) { setError('No valid rows. Required columns: bucket_name, question_text'); return; }
      setPreview(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !party) return;
    setImporting(true);
    try {
      // Get existing buckets for this party+examType
      const allBuckets = await base44.entities.Bucket.list();
      const existingBuckets = allBuckets.filter(b => b.party_id === party.id && b.exam_type === examType);
      const bucketMap = Object.fromEntries(existingBuckets.map(b => [b.name.toLowerCase(), b.id]));

      // Find unique new bucket names
      const uniqueBucketNames = [...new Set(preview.map(r => r.bucket_name.trim()))];
      for (const [idx, name] of uniqueBucketNames.entries()) {
        if (!bucketMap[name.toLowerCase()]) {
          const created = await base44.entities.Bucket.create({
            name,
            party_id: party.id,
            exam_type: examType,
            sort_order: existingBuckets.length + idx,
          });
          bucketMap[name.toLowerCase()] = created.id;
        }
      }

      // Create questions
      const questions = preview.map((r, idx) => ({
        text: r.question_text.trim(),
        expected_answer: r.expected_answer?.toString().trim() || '',
        notes: r.notes?.toString().trim() || '',
        type: examType,
        party_id: party.id,
        bucket_id: bucketMap[r.bucket_name.trim().toLowerCase()],
        sort_order: r.sort_order ?? idx,
        block_type: 'Question',
      }));

      await base44.entities.Question.bulkCreate(questions);
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
    const csv = `bucket_name,question_text,expected_answer,notes,sort_order\nBackground,Please state your full name.,John Smith,,1\nBackground,Where are you currently employed?,,Check CV,2\nExperience,How long have you worked in this field?,20 years,,3`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'questions_import_template.csv';
    a.click();
  };

  // Group preview by bucket for display
  const grouped = preview ? preview.reduce((acc, r) => {
    const key = r.bucket_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {}) : {};

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Import Questions for {party?.first_name} {party?.last_name} — {examType}
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload an Excel/CSV with columns: <code className="bg-slate-100 px-1 rounded">bucket_name</code>, <code className="bg-slate-100 px-1 rounded">question_text</code>, expected_answer, notes, sort_order.
              New buckets will be created automatically.
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              {parsing ? (
                <><Loader className="w-8 h-8 mx-auto text-slate-400 mb-2 animate-spin" /><p className="text-sm text-slate-600">Parsing…</p></>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" id="q-file-input" />
                  <label htmlFor="q-file-input" className="cursor-pointer text-blue-600 hover:underline">Click to upload</label>
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
              <p className="font-medium text-green-900">{preview.length} questions across {Object.keys(grouped).length} buckets</p>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {Object.entries(grouped).map(([bucketName, qs]) => (
                <div key={bucketName} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{bucketName}</span>
                    <span className="text-xs text-slate-500">{qs.length} questions</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {qs.slice(0, 5).map((q, i) => (
                      <li key={i} className="px-3 py-1.5 text-xs text-slate-600">{q.question_text}</li>
                    ))}
                    {qs.length > 5 && <li className="px-3 py-1.5 text-xs text-slate-400">…and {qs.length - 5} more</li>}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700">
                {importing ? 'Importing…' : `Import ${preview.length} Questions`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}