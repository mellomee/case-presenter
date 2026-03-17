import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader, Download, ChevronDown, ChevronRight } from 'lucide-react';

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

function partyDisplayName(party) {
  return [party.first_name, party.last_name].filter(Boolean).join(' ').trim();
}

export default function TrialDataImportModal({ open, onClose, onImportComplete, parties = [], trialPoints = [] }) {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const { data: allBuckets = [] } = useQuery({
    queryKey: ['allBuckets'],
    queryFn: () => base44.entities.Bucket.list(),
    enabled: open,
  });

  const reset = () => { setPreview(null); setError(null); setExpanded({}); };

  const downloadTemplate = () => {
    const rows = [
      ['trial_point_name', 'bucket_name', 'exam_type', 'party_first_name', 'party_last_name', 'question_text', 'parent_question_text', 'follow_up_group', 'expected_answer', 'notes', 'sort_order'],
      ['Liability', 'Background', 'Direct', 'Jane', 'Doe', 'Please state your full name.', '', '', 'Jane Doe', '', '1'],
      ['Liability', 'Background', 'Direct', 'Jane', 'Doe', 'Where were you on the date of the incident?', '', '', '', 'Check calendar', '2'],
      ['Liability', 'Background', 'Direct', 'Jane', 'Doe', 'Did you forget telling the officer that earlier?', 'Where were you on the date of the incident?', 'Forgot', '', '', '1'],
      ['Damages', 'Medical', 'Direct', 'Jane', 'Doe', 'Can you describe your injuries?', '', '', 'Broken arm', '', '1'],
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['# CURRENT PARTIES', '', '', '', '', '', '', '', '', '', ''],
      ...parties.map((party) => [`# PARTY: ${partyDisplayName(party)} | ID: ${party.id}`, '', '', '', '', '', '', '', '', '', '']),
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['# CURRENT TRIAL POINTS', '', '', '', '', '', '', '', '', '', ''],
      ...trialPoints.map((trialPoint) => [`# TRIAL POINT: ${trialPoint.name} | ID: ${trialPoint.id}`, '', '', '', '', '', '', '', '', '', '']),
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['# CURRENT BUCKETS', '', '', '', '', '', '', '', '', '', ''],
      ...allBuckets.map((bucket) => [`# BUCKET: ${bucket.name} | PARTY ID: ${bucket.party_id || '(none)'} | EXAM: ${bucket.exam_type} | ID: ${bucket.id}`, '', '', '', '', '', '', '', '', '', '']),
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['# NOTES', '', '', '', '', '', '', '', '', '', ''],
      ['# parent_question_text is only needed for child follow-up questions', '', '', '', '', '', '', '', '', '', ''],
      ['# follow_up_group options: Forgot or Deny', '', '', '', '', '', '', '', '', '', ''],
      ['# Parties are matched by first and last name', '', '', '', '', '', '', '', '', '', ''],
      ['# Trial Points and Buckets are matched by name; new ones are created automatically when missing', '', '', '', '', '', '', '', '', '', ''],
    ];

    downloadCsv(rows, 'trial_data_import_template.csv');
  };

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
            trial_point_name: { type: 'string' },
            bucket_name: { type: 'string' },
            exam_type: { type: 'string' },
            party_first_name: { type: 'string' },
            party_last_name: { type: 'string' },
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
        setError('Failed to parse file. Ensure it matches the template columns.');
        return;
      }

      const valid = [];
      const errors = [];

      result.output.forEach((row, index) => {
        const rowNum = index + 2;
        const rowErrors = [];
        const bucketName = normalizeValue(row.bucket_name);
        const questionText = normalizeValue(row.question_text);
        const examType = normalizeValue(row.exam_type);
        const firstName = normalizeValue(row.party_first_name);
        const lastName = normalizeValue(row.party_last_name);
        const followUpGroup = normalizeValue(row.follow_up_group);

        if (!bucketName) rowErrors.push('bucket_name is required');
        if (!questionText) rowErrors.push('question_text is required');
        if (!examType || !['Direct', 'Cross'].includes(examType)) rowErrors.push('exam_type must be "Direct" or "Cross"');

        let party = null;
        if (firstName || lastName) {
          party = parties.find(
            (item) => item.first_name?.toLowerCase() === firstName.toLowerCase() && item.last_name?.toLowerCase() === lastName.toLowerCase()
          );
          if (!party) rowErrors.push(`Party "${firstName} ${lastName}" not found`);
        }

        if (followUpGroup && !['Forgot', 'Deny'].includes(followUpGroup)) {
          rowErrors.push('follow_up_group must be Forgot or Deny');
        }

        if (rowErrors.length > 0) {
          errors.push({ rowNum, row, errors: rowErrors });
        } else {
          valid.push({
            ...row,
            _party: party,
            bucket_name: bucketName,
            question_text: questionText,
            exam_type: examType,
            parent_question_text: normalizeValue(row.parent_question_text),
            follow_up_group: followUpGroup,
          });
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

  const handleImport = async () => {
    if (!preview?.valid?.length) return;
    setImporting(true);

    try {
      const allTP = await base44.entities.TrialPoint.list();
      const allBucketsData = await base44.entities.Bucket.list();
      const allQuestions = await base44.entities.Question.list();

      const tpMap = Object.fromEntries(allTP.map((trialPoint) => [normalizeValue(trialPoint.name).toLowerCase(), trialPoint.id]));
      const bucketMap = {};
      allBucketsData.forEach((bucket) => {
        bucketMap[`${normalizeValue(bucket.name).toLowerCase()}|${bucket.party_id}|${bucket.exam_type}`] = bucket.id;
      });

      const parentQuestionMap = {};
      allQuestions
        .filter((question) => !question.parent_question_id)
        .forEach((question) => {
          parentQuestionMap[`${question.bucket_id}::${normalizeValue(question.text).toLowerCase()}`] = question.id;
        });

      let tpSortBase = allTP.length;
      let bucketSortBase = allBucketsData.length;

      const topLevelRows = preview.valid.filter((row) => !row.parent_question_text);
      const childRows = preview.valid.filter((row) => row.parent_question_text);

      for (const row of topLevelRows) {
        let tpId = null;
        if (normalizeValue(row.trial_point_name)) {
          const tpKey = normalizeValue(row.trial_point_name).toLowerCase();
          if (!tpMap[tpKey]) {
            const created = await base44.entities.TrialPoint.create({
              name: normalizeValue(row.trial_point_name),
              sort_order: tpSortBase++,
            });
            tpMap[tpKey] = created.id;
          }
          tpId = tpMap[tpKey];
        }

        const partyId = row._party?.id || '';
        const bucketKey = `${normalizeValue(row.bucket_name).toLowerCase()}|${partyId}|${row.exam_type}`;
        if (!bucketMap[bucketKey]) {
          const created = await base44.entities.Bucket.create({
            name: normalizeValue(row.bucket_name),
            party_id: partyId,
            exam_type: row.exam_type,
            trial_point_id: tpId || undefined,
            sort_order: bucketSortBase++,
          });
          bucketMap[bucketKey] = created.id;
        }

        const bucketId = bucketMap[bucketKey];
        const created = await base44.entities.Question.create({
          text: normalizeValue(row.question_text),
          expected_answer: normalizeValue(row.expected_answer) || '',
          notes: normalizeValue(row.notes) || '',
          type: row.exam_type,
          party_id: partyId,
          bucket_id: bucketId,
          sort_order: row.sort_order ?? 0,
          block_type: 'Question',
          parent_question_id: null,
          follow_up_group: null,
        });

        parentQuestionMap[`${bucketId}::${normalizeValue(row.question_text).toLowerCase()}`] = created.id;
      }

      for (const row of childRows) {
        const partyId = row._party?.id || '';
        const bucketKey = `${normalizeValue(row.bucket_name).toLowerCase()}|${partyId}|${row.exam_type}`;
        const bucketId = bucketMap[bucketKey];
        const parentQuestionId = parentQuestionMap[`${bucketId}::${normalizeValue(row.parent_question_text).toLowerCase()}`];

        if (!parentQuestionId) {
          throw new Error(`Could not find parent question "${row.parent_question_text}" in bucket "${row.bucket_name}".`);
        }

        await base44.entities.Question.create({
          text: normalizeValue(row.question_text),
          expected_answer: normalizeValue(row.expected_answer) || '',
          notes: normalizeValue(row.notes) || '',
          type: row.exam_type,
          party_id: partyId,
          bucket_id: bucketId,
          sort_order: row.sort_order ?? 0,
          block_type: 'Question',
          parent_question_id: parentQuestionId,
          follow_up_group: row.follow_up_group || null,
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

  const grouped = preview?.valid.reduce((acc, row) => {
    const tpKey = normalizeValue(row.trial_point_name) || '(No Trial Point)';
    const bucketKey = `${normalizeValue(row.bucket_name)} [${row.exam_type}] ${row._party ? `— ${row._party.first_name} ${row._party.last_name}` : ''}`;
    if (!acc[tpKey]) acc[tpKey] = {};
    if (!acc[tpKey][bucketKey]) acc[tpKey][bucketKey] = [];
    acc[tpKey][bucketKey].push(row);
    return acc;
  }, {}) || {};

  const toggleExpand = (key) => setExpanded((value) => ({ ...value, [key]: !value[key] }));

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import — Trial Points, Buckets & Questions</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload an Excel or CSV file. Required columns: <code className="bg-slate-100 px-1 rounded text-xs">bucket_name</code>, <code className="bg-slate-100 px-1 rounded text-xs">exam_type</code>, <code className="bg-slate-100 px-1 rounded text-xs">question_text</code>.
              Optional: <code className="bg-slate-100 px-1 rounded text-xs">trial_point_name</code>, <code className="bg-slate-100 px-1 rounded text-xs">parent_question_text</code>, <code className="bg-slate-100 px-1 rounded text-xs">follow_up_group</code>, party names, expected_answer, notes, sort_order.
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
              <Download className="w-4 h-4" /> Download Template with References
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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

            {preview.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <button className="w-full flex items-center justify-between px-3 py-2 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={() => toggleExpand('errors')}>
                  <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {preview.errors.length} Error Rows (will be skipped)</span>
                  {expanded.errors ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expanded.errors && (
                  <div className="divide-y divide-red-100 max-h-40 overflow-y-auto">
                    {preview.errors.map(({ rowNum, row, errors: rowErrors }) => (
                      <div key={rowNum} className="px-3 py-2">
                        <p className="text-xs font-semibold text-red-700">Row {rowNum}: {normalizeValue(row.question_text) || '—'}</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {rowErrors.map((entry, index) => <li key={index} className="text-xs text-red-600">• {entry}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
              {Object.entries(grouped).map(([tpName, buckets]) => (
                <div key={tpName} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left" onClick={() => toggleExpand(tpName)}>
                    <span className="text-sm font-semibold text-slate-700">{tpName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{Object.values(buckets).flat().length} questions</span>
                      {expanded[tpName] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>
                  {expanded[tpName] && (
                    <div className="divide-y divide-slate-100">
                      {Object.entries(buckets).map(([bucketLabel, rows]) => (
                        <div key={bucketLabel} className="px-3 py-2">
                          <p className="text-xs font-semibold text-blue-700 mb-1">{bucketLabel} ({rows.length})</p>
                          <ul className="space-y-0.5">
                            {rows.slice(0, 4).map((row, index) => (
                              <li key={index} className="text-xs text-slate-600 truncate">
                                • {row.question_text}
                                {row.parent_question_text && (
                                  <span className="text-slate-400"> — child of {row.parent_question_text} ({row.follow_up_group || 'Other'})</span>
                                )}
                              </li>
                            ))}
                            {rows.length > 4 && <li className="text-xs text-slate-400">…and {rows.length - 4} more</li>}
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