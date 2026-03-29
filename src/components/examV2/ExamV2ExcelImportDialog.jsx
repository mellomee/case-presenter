import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Download, Loader, Upload } from 'lucide-react';

function normalizeValue(value) {
  return String(value ?? '').trim();
}

function normalizeKey(value) {
  return normalizeValue(value).toLowerCase();
}

function buildProofLookup(proofs = []) {
  const lookup = new Map();

  proofs.forEach((proof) => {
    [proof.name, proof.formal_name].forEach((value) => {
      const key = normalizeKey(value);
      if (key && !lookup.has(key)) lookup.set(key, proof);
    });
  });

  return lookup;
}

function parseAttachedProofNames(value) {
  return normalizeValue(value)
    .split('|')
    .map((entry) => normalizeValue(entry))
    .filter(Boolean);
}

function sortQuestions(rows = []) {
  return [...rows].sort((a, b) => {
    const aOrder = Number.isFinite(a.question_order) ? a.question_order : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.question_order) ? b.question_order : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.row_number - b.row_number;
  });
}

function createWorkbook(rowsBySheet) {
  const workbook = XLSX.utils.book_new();
  rowsBySheet.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });
  return workbook;
}

function ImportSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-300 focus:outline-none"
    >
      {children}
    </select>
  );
}

export default function ExamV2ExcelImportDialog({
  open,
  onOpenChange,
  parties = [],
  selectedPartyId = '',
  onSelectedPartyIdChange,
  selectedExamType = 'Direct',
  onSelectedExamTypeChange,
  availableRootProofs = [],
  allProofs = [],
  onImport,
}) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const selectedParty = parties.find((party) => party.id === selectedPartyId) || null;
  const rootProofLookup = useMemo(() => buildProofLookup(availableRootProofs), [availableRootProofs]);
  const attachmentProofLookup = useMemo(() => buildProofLookup(allProofs), [allProofs]);

  const reset = () => {
    setPreview(null);
    setError('');
    setParsing(false);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const templateRows = [
      ['exam_order', 'item_type', 'root_item_name', 'question_text', 'parent_question_text', 'question_order', 'expected_answer', 'notes', 'attached_proof_names'],
      [1, 'Question Group', 'Background', 'Please state your name.', '', 1, '', '', ''],
      [1, 'Question Group', 'Background', 'Where do you live?', '', 2, '', '', ''],
      [1, 'Question Group', 'Background', 'Who do you live with?', 'Where do you live?', 1, '', 'Follow-up question', ''],
      [2, 'Proof', 'my new extract pages 1,3,5', 'Go to Page 3, please read the highlighted text', '', 1, '', '', 'some highlights'],
      ['', '', '', '', '', '', '', '', ''],
      ['# attached_proof_names accepts multiple values separated by |', '', '', '', '', '', '', '', ''],
      ['# parent_question_text must match an earlier question in the same exam_order section', '', '', '', '', '', '', '', ''],
    ];

    const guideRows = [
      ['Field', 'Required', 'How it works'],
      ['exam_order', 'Yes', 'Whole number. Each exam order becomes a printed section/page.'],
      ['item_type', 'Yes', 'Use Proof or Question Group.'],
      ['root_item_name', 'Yes', 'For Proof use the proof Internal Name or Display Name. For Question Group use any group name you want created.'],
      ['question_text', 'Optional', 'Leave blank if you only want to create the root proof/group on that row.'],
      ['parent_question_text', 'Optional', 'Creates a follow-up under an earlier question in the same exam_order section.'],
      ['question_order', 'Optional', 'Numeric question order inside that section. If blank, the sheet row order is used.'],
      ['expected_answer', 'Optional', 'Printed under the question in green.'],
      ['notes', 'Optional', 'Printed under the question as attorney notes.'],
      ['attached_proof_names', 'Optional', 'Use proof Internal Names or Display Names separated by |.'],
      ['', '', 'Current import target'],
      ['party', 'Context', selectedParty ? `${selectedParty.first_name} ${selectedParty.last_name}` : 'Select a party first'],
      ['exam_type', 'Context', selectedExamType],
    ];

    const proofReferenceRows = [
      ['Internal Name', 'Display Name', 'Category', 'Status', 'Joint #', 'Admitted #', 'Demo #'],
      ...availableRootProofs.map((proof) => [
        proof.name || '',
        proof.formal_name || '',
        proof.proof_category || '',
        proof.status || '',
        proof.joint_exhibit_num || '',
        proof.admitted_exhibit_num || '',
        proof.demonstrative_exhibit_num || '',
      ]),
    ];

    const attachmentReferenceRows = [
      ['Internal Name', 'Display Name', 'Parent Proof', 'Type', 'Status'],
      ...allProofs.map((proof) => [
        proof.name || '',
        proof.formal_name || '',
        proof.parent_proof_id || '',
        proof.proof_child_type || proof.file_type || proof.proof_category || '',
        proof.status || '',
      ]),
    ];

    const workbook = createWorkbook([
      { name: 'Template', rows: templateRows },
      { name: 'Field Guide', rows: guideRows },
      { name: 'Root Proof Reference', rows: proofReferenceRows },
      { name: 'Attachment Reference', rows: attachmentReferenceRows },
    ]);

    XLSX.writeFile(workbook, 'exam_builder_v2_import_template.xlsx');
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setParsing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!Array.isArray(rows) || rows.length === 0) {
        setError('The Excel file is empty or missing data rows.');
        setPreview(null);
        return;
      }

      const grouped = new Map();
      const errors = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const examOrder = Number(normalizeValue(row.exam_order));
        const itemTypeRaw = normalizeValue(row.item_type);
        const itemTypeKey = normalizeKey(itemTypeRaw);
        const rootItemName = normalizeValue(row.root_item_name);
        const questionText = normalizeValue(row.question_text);
        const parentQuestionText = normalizeValue(row.parent_question_text);
        const expectedAnswer = normalizeValue(row.expected_answer);
        const notes = normalizeValue(row.notes);
        const attachedProofNames = parseAttachedProofNames(row.attached_proof_names);
        const questionOrderValue = normalizeValue(row.question_order);
        const questionOrder = questionOrderValue ? Number(questionOrderValue) : null;
        const rowErrors = [];

        const normalizedItemType = itemTypeKey === 'proof'
          ? 'proof'
          : itemTypeKey === 'question group'
            ? 'group'
            : '';

        if (!Number.isFinite(examOrder) || examOrder <= 0) rowErrors.push('exam_order is required and must be a whole number.');
        if (!normalizedItemType) rowErrors.push('item_type must be Proof or Question Group.');
        if (!rootItemName) rowErrors.push('root_item_name is required.');
        if (questionOrderValue && !Number.isFinite(questionOrder)) rowErrors.push('question_order must be numeric when provided.');

        const matchedRootProof = normalizedItemType === 'proof' ? rootProofLookup.get(normalizeKey(rootItemName)) || null : null;
        if (normalizedItemType === 'proof' && !matchedRootProof) {
          rowErrors.push(`Proof \"${rootItemName}\" was not found for this import.`);
        }

        const matchedAttachedProofs = attachedProofNames.map((name) => attachmentProofLookup.get(normalizeKey(name)) || null);
        matchedAttachedProofs.forEach((proof, proofIndex) => {
          if (!proof) rowErrors.push(`Attached proof \"${attachedProofNames[proofIndex]}\" was not found.`);
        });

        if (rowErrors.length > 0) {
          errors.push({ rowNumber, rowErrors, label: questionText || rootItemName || 'Row error' });
          return;
        }

        const groupKey = `${examOrder}::${normalizedItemType}::${normalizeKey(rootItemName)}`;
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, {
            exam_order: examOrder,
            item_type: normalizedItemType,
            root_item_name: rootItemName,
            matched_root_proof: matchedRootProof,
            source_row: rowNumber,
            question_rows: [],
          });
        }

        if (questionText || parentQuestionText || expectedAnswer || notes || matchedAttachedProofs.length > 0) {
          grouped.get(groupKey).question_rows.push({
            row_number: rowNumber,
            question_text: questionText,
            parent_question_text: parentQuestionText,
            expected_answer: expectedAnswer,
            notes,
            question_order: Number.isFinite(questionOrder) ? questionOrder : null,
            attached_proof_ids: matchedAttachedProofs.filter(Boolean).map((proof) => proof.id),
          });
        }
      });

      const rootItems = [...grouped.values()]
        .sort((a, b) => a.exam_order - b.exam_order || a.source_row - b.source_row)
        .map((root) => ({
          ...root,
          question_rows: sortQuestions(root.question_rows),
        }));

      if (rootItems.length === 0 && errors.length === 0) {
        setError('No valid import rows were found.');
        setPreview(null);
        return;
      }

      setPreview({ rootItems, errors });
    } catch (parseError) {
      setError(parseError.message || 'Failed to read the Excel file.');
      setPreview(null);
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!preview?.rootItems?.length || !onImport) return;
    setImporting(true);
    setError('');

    try {
      await onImport(preview.rootItems);
      reset();
      onOpenChange(false);
    } catch (importError) {
      setError(importError.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview?.rootItems?.length || 0;
  const totalQuestionCount = preview?.rootItems?.reduce((sum, root) => sum + root.question_rows.length, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) reset(); onOpenChange(nextOpen); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle>Bulk Import — Exam Builder V2</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-4">
              <p className="font-semibold text-slate-900">Import target</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">Party</p>
                  <ImportSelect value={selectedPartyId} onChange={onSelectedPartyIdChange}>
                    <option value="">Select party</option>
                    {parties.map((party) => (
                      <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>
                    ))}
                  </ImportSelect>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">Exam Type</p>
                  <ImportSelect value={selectedExamType} onChange={onSelectedExamTypeChange}>
                    <option value="Direct">Direct</option>
                    <option value="Cross">Cross</option>
                    <option value="Redirect">Redirect</option>
                  </ImportSelect>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">Required fields</p>
              <p><code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">exam_order</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">item_type</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">root_item_name</code></p>
              <p className="font-semibold text-slate-900 pt-2">Optional fields</p>
              <p><code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">question_text</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">parent_question_text</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">question_order</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">expected_answer</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">notes</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700 border border-slate-200">attached_proof_names</code></p>
              <p className="text-xs text-slate-500 pt-2">Use <span className="font-medium">Question Group</span> if you only want to import questions and follow-ups now and add proof later.</p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50">
              {parsing ? (
                <>
                  <Loader className="w-8 h-8 mx-auto mb-3 animate-spin text-slate-500" />
                  <p className="text-sm text-slate-600">Reading Excel file…</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-3 text-slate-500" />
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" id="exam-v2-import-file-editable" />
                  <label htmlFor="exam-v2-import-file-editable" className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">Click to upload Excel</label>
                  <p className="mt-1 text-xs text-slate-500">XLSX recommended</p>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button variant="outline" className="w-full gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={downloadTemplate}>
              <Download className="w-4 h-4" /> Download Excel Template
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{validCount}</p>
                <p className="text-xs text-emerald-700">Exam Order Sections</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{totalQuestionCount}</p>
                <p className="text-xs text-blue-700">Questions</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${preview.errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${preview.errors.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>{preview.errors.length}</p>
                <p className={`text-xs ${preview.errors.length > 0 ? 'text-red-700' : 'text-slate-600'}`}>Rows Skipped</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3">
              {preview.rootItems.map((root, index) => (
                <div key={`${root.exam_order}-${root.root_item_name}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Exam Order {root.exam_order}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{root.root_item_name}</p>
                      <p className="mt-1 text-xs text-slate-600">{root.item_type === 'proof' ? 'Proof' : 'Question Group'} · {root.question_rows.length} questions</p>
                    </div>
                    {root.item_type === 'proof' && root.matched_root_proof && (
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {preview.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Skipped rows</p>
                <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                  {preview.errors.map((entry) => (
                    <div key={entry.rowNumber} className="text-xs text-red-700">
                      <p className="font-semibold">Row {entry.rowNumber}: {entry.label}</p>
                      {entry.rowErrors.map((message, index) => <p key={index}>• {message}</p>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={reset} disabled={importing}>Back</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? 'Importing…' : `Import ${validCount} Sections`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}