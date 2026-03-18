import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { downloadExamImportTemplate, parseExamImportWorkbook, splitPipeList } from '@/lib/examV2Workbook';
import { getProofDisplayName } from '@/lib/examV2Utils';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

export default function ImportExamWorkbookDialog({
  open,
  onOpenChange,
  selectedParty,
  selectedExamType,
  proofs = [],
  rootItems = [],
  onEnsureExam,
  onImported,
}) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    try {
      const parsedRows = await parseExamImportWorkbook(file);
      setRows(parsedRows);
    } catch (nextError) {
      setRows([]);
      setError(nextError.message || 'Could not read this Excel file.');
    }
  };

  const handleImport = async () => {
    if (!selectedParty) {
      setError('Select a party first.');
      return;
    }

    if (rows.length === 0) {
      setError('Upload a filled Excel template first.');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const exam = await onEnsureExam();
      const proofsByInternalName = Object.fromEntries(
        proofs.map((proof) => [normalizeKey(proof.name), proof])
      );

      const groupedRows = [...rows]
        .sort((a, b) => Number(a.exam_order || 0) - Number(b.exam_order || 0) || a._rowNumber - b._rowNumber)
        .reduce((accumulator, row) => {
          const key = row.exam_order;
          if (!key) {
            throw new Error(`Row ${row._rowNumber}: exam_order is required.`);
          }

          if (!accumulator[key]) accumulator[key] = [];
          accumulator[key].push(row);
          return accumulator;
        }, {});

      let nextRootSort = rootItems.length;
      const orderedKeys = Object.keys(groupedRows).sort((a, b) => Number(a) - Number(b));

      for (const key of orderedKeys) {
        const groupRows = groupedRows[key];
        const rootRow = groupRows[0];
        const itemType = normalizeKey(rootRow.item_type);

        if (!itemType) {
          throw new Error(`Row ${rootRow._rowNumber}: item_type is required.`);
        }

        let rootItem;
        let rootProof = null;

        if (itemType === 'proof') {
          if (!rootRow.proof_internal_name) {
            throw new Error(`Row ${rootRow._rowNumber}: proof_internal_name is required for Proof rows.`);
          }

          rootProof = proofsByInternalName[normalizeKey(rootRow.proof_internal_name)];
          if (!rootProof) {
            throw new Error(`Row ${rootRow._rowNumber}: proof \"${rootRow.proof_internal_name}\" was not found.`);
          }

          rootItem = await base44.entities.ExamItemV2.create({
            exam_id: exam.id,
            item_type: 'proof',
            linked_proof_id: rootProof.id,
            label: getProofDisplayName(rootProof),
            step_overrides: {},
            sort_order: nextRootSort,
          });

          await base44.entities.ExamItemV2.create({
            exam_id: exam.id,
            item_type: 'admission_script',
            parent_item_id: rootItem.id,
            label: 'Exhibit Admission Script',
            step_overrides: {},
            sort_order: 0,
          });
        } else if (itemType === 'group') {
          if (!rootRow.group_name) {
            throw new Error(`Row ${rootRow._rowNumber}: group_name is required for Group rows.`);
          }

          rootItem = await base44.entities.ExamItemV2.create({
            exam_id: exam.id,
            item_type: 'group',
            label: rootRow.group_name,
            sort_order: nextRootSort,
          });
        } else {
          throw new Error(`Row ${rootRow._rowNumber}: item_type must be Proof or Group.`);
        }

        nextRootSort += 1;

        const createdQuestionIds = new Map();
        const sortCounters = new Map([[rootItem.id, rootProof ? 1 : 0]]);

        for (const row of groupRows) {
          if (!row.question_text) continue;

          const parentQuestionRef = normalizeKey(row.parent_question_ref);
          const parentItemId = parentQuestionRef ? createdQuestionIds.get(parentQuestionRef) : rootItem.id;

          if (parentQuestionRef && !parentItemId) {
            throw new Error(`Row ${row._rowNumber}: parent_question_ref \"${row.parent_question_ref}\" was not found earlier in this exam item.`);
          }

          const attachedProofIds = splitPipeList(row.attached_proof_internal_names).map((name) => {
            const proof = proofsByInternalName[normalizeKey(name)];
            if (!proof) {
              throw new Error(`Row ${row._rowNumber}: attached proof \"${name}\" was not found.`);
            }
            return proof.id;
          });

          const sortOrder = sortCounters.get(parentItemId) || 0;
          sortCounters.set(parentItemId, sortOrder + 1);

          const createdQuestion = await base44.entities.ExamItemV2.create({
            exam_id: exam.id,
            item_type: 'question',
            parent_item_id: parentItemId,
            sort_order: sortOrder,
            text: row.question_text,
            expected_answer: row.expected_answer || '',
            notes: row.notes || '',
            attached_proof_ids: attachedProofIds.length > 0 ? { ids: attachedProofIds } : null,
          });

          if (row.question_ref) {
            createdQuestionIds.set(normalizeKey(row.question_ref), createdQuestion.id);
          }
        }
      }

      onImported?.();
      onOpenChange(false);
      setRows([]);
      setFileName('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (nextError) {
      setError(nextError.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Import Exam Builder Excel</DialogTitle>
          <DialogDescription className="text-slate-400">
            Import into {selectedParty ? `${selectedParty.first_name} ${selectedParty.last_name}` : 'the selected party'} · {selectedExamType} using names instead of IDs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300 space-y-2">
            <p><span className="font-semibold text-white">Required:</span> exam_order, item_type, plus proof_internal_name for Proof rows or group_name for Group rows.</p>
            <p><span className="font-semibold text-white">Optional:</span> question_ref, parent_question_ref, question_text, expected_answer, notes, attached_proof_internal_names.</p>
            <p>Use exact Proof Internal Names and separate multiple attached proofs with a | character.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={downloadExamImportTemplate}>
              Download Excel Template
            </Button>
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => inputRef.current?.click()}>
              Upload Filled Excel
            </Button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>

          {fileName && <p className="text-sm text-slate-400">Loaded file: <span className="text-white">{fileName}</span></p>}
          {rows.length > 0 && <p className="text-sm text-emerald-300">Ready to import {rows.length} populated row(s).</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={isImporting} onClick={handleImport}>
              {isImporting ? 'Importing…' : 'Import Excel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}