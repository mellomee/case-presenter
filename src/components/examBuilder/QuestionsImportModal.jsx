import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';

function normalizeValue(value) {
  return value?.toString().trim() || '';
}

function csvEscape(value) {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = filename;
  link.click();
}

export default function QuestionsImportModal({ open, onClose, onImportComplete, party, examType }) {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const { data: allBuckets = [] } = useQuery({
    queryKey: ['allBuckets'],
    queryFn: () => base44.entities.Bucket.list(),
    enabled: open,
  });

  const currentBuckets = allBuckets
    .filter((bucket) => bucket.party_id === party?.id && bucket.exam_type === examType)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

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
            parent_question_text: { type: 'string' },
            follow_up_group: { type: 'string' },
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

      const rows = result.output.filter((row) => row.bucket_name && row.question_text);
      if (rows.length === 0) {
        setError('No valid rows. Required columns: bucket_name, question_text');
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
    if (!preview || !party) return;
    setImporting(true);

    try {
      const allBucketsData = await base44.entities.Bucket.list();
      const existingBuckets = allBucketsData.filter((bucket) => bucket.party_id === party.id && bucket.exam_type === examType);
      const bucketMap = Object.fromEntries(existingBuckets.map((bucket) => [bucket.name.toLowerCase(), bucket.id]));

      const allQuestions = await base44.entities.Question.list();
      const parentQuestionMap = {};

      allQuestions
        .filter((question) => question.party_id === party.id && question.type === examType && !question.parent_question_id)
        .forEach((question) => {
          const key = `${question.bucket_id}::${normalizeValue(question.text).toLowerCase()}`;
          parentQuestionMap[key] = question.id;
        });

      const uniqueBucketNames = [...new Set(preview.map((row) => normalizeValue(row.bucket_name)).filter(Boolean))];
      for (const [index, name] of uniqueBucketNames.entries()) {
        const key = name.toLowerCase();
        if (!bucketMap[key]) {
          const created = await base44.entities.Bucket.create({
            name,
            party_id: party.id,
            exam_type: examType,
            sort_order: existingBuckets.length + index,
          });
          bucketMap[key] = created.id;
        }
      }

      const topLevelRows = preview.filter((row) => !normalizeValue(row.parent_question_text));
      const childRows = preview.filter((row) => normalizeValue(row.parent_question_text));

      for (let index = 0; index < topLevelRows.length; index += 1) {
        const row = topLevelRows[index];
        const bucketId = bucketMap[normalizeValue(row.bucket_name).toLowerCase()];
        const created = await base44.entities.Question.create({
          text: normalizeValue(row.question_text),
          expected_answer: normalizeValue(row.expected_answer) || '',
          notes: normalizeValue(row.notes) || '',
          type: examType,
          party_id: party.id,
          bucket_id: bucketId,
          sort_order: row.sort_order ?? index,
          block_type: 'Question',
          parent_question_id: null,
          follow_up_group: null,
        });
        parentQuestionMap[`${bucketId}::${normalizeValue(row.question_text).toLowerCase()}`] = created.id;
      }

      for (let index = 0; index < childRows.length; index += 1) {
        const row = childRows[index];
        const bucketId = bucketMap[normalizeValue(row.bucket_name).toLowerCase()];
        const parentKey = `${bucketId}::${normalizeValue(row.parent_question_text).toLowerCase()}`;
        const parentQuestionId = parentQuestionMap[parentKey];

        if (!parentQuestionId) {
          throw new Error(`Could not find parent question "${normalizeValue(row.parent_question_text)}" in bucket "${normalizeValue(row.bucket_name)}".`);
        }

        const groupValue = normalizeValue(row.follow_up_group);
        if (groupValue && !['Forgot', 'Deny'].includes(groupValue)) {
          throw new Error(`Invalid follow_up_group "${groupValue}" for child question "${normalizeValue(row.question_text)}".`);
        }

        await base44.entities.Question.create({
          text: normalizeValue(row.question_text),
          expected_answer: normalizeValue(row.expected_answer) || '',
          notes: normalizeValue(row.notes) || '',
          type: examType,
          party_id: party.id,
          bucket_id: bucketId,
          sort_order: row.sort_order ?? index,
          block_type: 'Question',
          parent_question_id: parentQuestionId,
          follow_up_group: groupValue || null,
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

  const reset = () => {
    setPreview(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const rows = [
      ['bucket_name', 'question_text', 'parent_question_text', 'follow_up_group', 'expected_answer', 'notes', 'sort_order'],
      ['Background', 'Please state your full name.', '', '', 'John Smith', '', '1'],
      ['Background', 'Where do you live?', '', '', '', 'Basic intro', '2'],
      ['Background', 'Did you forget telling the officer that earlier?', 'Where do you live?', 'Forgot', '', '', '1'],
      ['Background', 'That statement is not true, correct?', 'Where do you live?', 'Deny', '', '', '2'],
      ['', '', '', '', '', '', ''],
      [`# CURRENT BUCKETS FOR ${party?.first_name || ''} ${party?.last_name || ''} — ${examType}`, '', '', '', '', '', ''],
      ...currentBuckets.map((bucket) => [`# BUCKET: ${bucket.name} | ID: ${bucket.id}`, '', '', '', '', '', '']),
      ['', '', '', '', '', '', ''],
      ['# NOTES', '', '', '', '', '', ''],
      ['# parent_question_text is only needed for child follow-up questions', '', '', '', '', '', ''],
      ['# follow_up_group options: Forgot or Deny', '', '', '', '', '', ''],
      ['# Buckets are matched by name; new ones will be created automatically', '', '', '', '', '', ''],
    ];

    downloadCsv(rows, 'questions_import_template.csv');
  };

  const grouped = preview
    ? preview.reduce((acc, row) => {
        const key = normalizeValue(row.bucket_name);
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {})
    : {};

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Import Questions for {party?.first_name} {party?.last_name} — {examType}
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload an Excel/CSV with columns: <code className="bg-slate-100 px-1 rounded">bucket_name</code>, <code className="bg-slate-100 px-1 rounded">question_text</code>,
              optional <code className="bg-slate-100 px-1 rounded">parent_question_text</code> and <code className="bg-slate-100 px-1 rounded">follow_up_group</code>.
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
            <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2"><Download className="w-4 h-4" /> Download Template with References</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="font-medium text-green-900">{preview.length} questions across {Object.keys(grouped).length} buckets</p>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {Object.entries(grouped).map(([bucketName, rows]) => (
                <div key={bucketName} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{bucketName}</span>
                    <span className="text-xs text-slate-500">{rows.length} questions</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {rows.slice(0, 6).map((row, index) => (
                      <li key={index} className="px-3 py-1.5 text-xs text-slate-600">
                        {row.question_text}
                        {normalizeValue(row.parent_question_text) && (
                          <span className="text-slate-400"> — child of {normalizeValue(row.parent_question_text)} ({normalizeValue(row.follow_up_group) || 'Other'})</span>
                        )}
                      </li>
                    ))}
                    {rows.length > 6 && <li className="px-3 py-1.5 text-xs text-slate-400">…and {rows.length - 6} more</li>}
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