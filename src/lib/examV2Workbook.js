import * as XLSX from 'xlsx';

export const EXAM_IMPORT_COLUMNS = [
  'exam_order',
  'item_type',
  'proof_internal_name',
  'group_name',
  'question_ref',
  'parent_question_ref',
  'question_text',
  'expected_answer',
  'notes',
  'attached_proof_internal_names',
];

const SAMPLE_ROWS = [
  {
    exam_order: 1,
    item_type: 'Proof',
    proof_internal_name: 'Dr Smith CV',
    group_name: '',
    question_ref: '',
    parent_question_ref: '',
    question_text: '',
    expected_answer: '',
    notes: '',
    attached_proof_internal_names: '',
  },
  {
    exam_order: 1,
    item_type: 'Proof',
    proof_internal_name: 'Dr Smith CV',
    group_name: '',
    question_ref: 'Q1',
    parent_question_ref: '',
    question_text: 'Please state your full name for the record.',
    expected_answer: 'Dr. John Smith',
    notes: 'Foundation question',
    attached_proof_internal_names: 'Dr Smith CV',
  },
  {
    exam_order: 1,
    item_type: 'Proof',
    proof_internal_name: 'Dr Smith CV',
    group_name: '',
    question_ref: 'Q1A',
    parent_question_ref: 'Q1',
    question_text: 'What is your current occupation?',
    expected_answer: 'Orthopedic surgeon',
    notes: '',
    attached_proof_internal_names: '',
  },
  {
    exam_order: 2,
    item_type: 'Group',
    proof_internal_name: '',
    group_name: 'Damages Theme',
    question_ref: 'G1',
    parent_question_ref: '',
    question_text: 'What changed in your daily life after the incident?',
    expected_answer: '',
    notes: 'Open-ended',
    attached_proof_internal_names: 'Medical Bills Summary|Life Care Plan',
  },
];

const INSTRUCTIONS_ROWS = [
  ['Column', 'Required?', 'What to enter'],
  ['exam_order', 'Required', 'Number used to group rows into Question 1, Question 2, etc.'],
  ['item_type', 'Required', 'Use Proof or Group.'],
  ['proof_internal_name', 'Required for Proof', 'Exact Proof Internal Name from Proof Vault.'],
  ['group_name', 'Required for Group', 'Question group label.'],
  ['question_ref', 'Optional', 'Your own human-friendly reference label like Q1 or Followup-A.'],
  ['parent_question_ref', 'Optional', 'Use another question_ref to create follow-up questions.'],
  ['question_text', 'Optional', 'Leave blank if you only want to create the root proof/group item.'],
  ['expected_answer', 'Optional', 'Expected answer shown under the question.'],
  ['notes', 'Optional', 'Attorney notes shown under the question.'],
  ['attached_proof_internal_names', 'Optional', 'Use exact Proof Internal Names separated by | characters.'],
  ['', '', 'IDs are not needed anywhere in this template.'],
  ['', '', 'For follow-ups, list the parent question row earlier in the sheet first.'],
];

export function normalizeImportRows(rows = []) {
  return rows
    .map((row, index) => ({
      exam_order: String(row.exam_order || '').trim(),
      item_type: String(row.item_type || '').trim(),
      proof_internal_name: String(row.proof_internal_name || '').trim(),
      group_name: String(row.group_name || '').trim(),
      question_ref: String(row.question_ref || '').trim(),
      parent_question_ref: String(row.parent_question_ref || '').trim(),
      question_text: String(row.question_text || '').trim(),
      expected_answer: String(row.expected_answer || '').trim(),
      notes: String(row.notes || '').trim(),
      attached_proof_internal_names: String(row.attached_proof_internal_names || '').trim(),
      _rowNumber: index + 2,
    }))
    .filter((row) => Object.values(row).some((value) => value && String(value).trim()));
}

export function splitPipeList(value = '') {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function downloadExamImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const importSheet = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: EXAM_IMPORT_COLUMNS });
  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_ROWS);

  XLSX.utils.book_append_sheet(workbook, importSheet, 'ExamImport');
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  XLSX.writeFile(workbook, 'exam-builder-v2-template.xlsx');
}

export function parseExamImportWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'array' });
        const worksheet = workbook.Sheets.ExamImport || workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          reject(new Error('No worksheet found in this Excel file.'));
          return;
        }

        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(normalizeImportRows(rows));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Unable to read this Excel file.'));
    reader.readAsArrayBuffer(file);
  });
}