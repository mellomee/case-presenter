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

function createError(lineNumber, label, message) {
  return {
    rowNumber: lineNumber,
    label,
    rowErrors: [message],
  };
}

export function parseExamV2TextImport({ rawText, availableRootProofs = [], allProofs = [] }) {
  const lines = String(rawText || '').replace(/\r/g, '').split('\n');
  const rootProofLookup = buildProofLookup(availableRootProofs);
  const attachmentProofLookup = buildProofLookup(allProofs);
  const rootItems = [];
  const errors = [];

  let currentRoot = null;
  let currentQuestion = null;
  let questionStack = [];
  let activeMultilineField = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (activeMultilineField && trimmed) {
      const isNextCommand = /^((PROOF\s*:)|(GROUP\s*:)|(QUESTION\s+GROUP\s*:)|(@attach(?:ed\s+proofs?)?\s*:)|(@notes?\s*:)|(->\s*)|(\s*)([-*•]|\d+\.)\s+)/i.test(line);
      if (!isNextCommand) {
        const nextValue = activeMultilineField.target[activeMultilineField.key]
          ? `${activeMultilineField.target[activeMultilineField.key]}\n${normalizeValue(line)}`
          : normalizeValue(line);
        activeMultilineField.target[activeMultilineField.key] = nextValue;
        return;
      }
      activeMultilineField = null;
    }

    if (!trimmed) {
      if (activeMultilineField) {
        activeMultilineField.target[activeMultilineField.key] = `${activeMultilineField.target[activeMultilineField.key]}\n`;
      }
      return;
    }

    const proofMatch = trimmed.match(/^PROOF\s*:\s*(.+)$/i);
    if (proofMatch) {
      const rootItemName = normalizeValue(proofMatch[1]);
      const matchedRootProof = rootProofLookup.get(normalizeKey(rootItemName)) || null;

      if (!matchedRootProof) {
        errors.push(createError(lineNumber, rootItemName, `Proof \"${rootItemName}\" was not found.`));
        currentRoot = null;
        currentQuestion = null;
        questionStack = [];
        activeMultilineField = null;
        return;
      }

      currentRoot = {
        exam_order: rootItems.length + 1,
        item_type: 'proof',
        root_item_name: rootItemName,
        matched_root_proof: matchedRootProof,
        source_row: lineNumber,
        question_rows: [],
      };
      rootItems.push(currentRoot);
      currentQuestion = null;
      questionStack = [];
      activeMultilineField = null;
      return;
    }

    const groupMatch = trimmed.match(/^(GROUP|QUESTION\s+GROUP)\s*:\s*(.+)$/i);
    if (groupMatch) {
      const rootItemName = normalizeValue(groupMatch[2]);
      currentRoot = {
        exam_order: rootItems.length + 1,
        item_type: 'group',
        root_item_name: rootItemName,
        matched_root_proof: null,
        source_row: lineNumber,
        question_rows: [],
      };
      rootItems.push(currentRoot);
      currentQuestion = null;
      questionStack = [];
      activeMultilineField = null;
      return;
    }

    if (!currentRoot) {
      errors.push(createError(lineNumber, trimmed, 'Start each section with PROOF: or GROUP:.'));
      return;
    }

    const questionMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.+)$/);
    if (questionMatch) {
      const indent = questionMatch[1].length;
      const level = Math.floor(indent / 2);
      const questionText = normalizeValue(questionMatch[3]);
      const parentQuestion = level > 0 ? questionStack[level - 1] || null : null;

      if (level > 0 && !parentQuestion) {
        errors.push(createError(lineNumber, questionText, 'Indented follow-up is missing a parent question above it.'));
        return;
      }

      const questionRow = {
        row_number: lineNumber,
        question_text: questionText,
        parent_question_text: parentQuestion?.question_text || '',
        expected_answer: '',
        notes: '',
        question_order: null,
        attached_proof_ids: [],
      };

      currentRoot.question_rows.push(questionRow);
      currentQuestion = questionRow;
      questionStack[level] = questionRow;
      questionStack = questionStack.slice(0, level + 1);
      return;
    }

    const answerMatch = trimmed.match(/^->\s*(.+)$/);
    if (answerMatch) {
      if (!currentQuestion) {
        errors.push(createError(lineNumber, trimmed, 'Answer line must come after a question.'));
        return;
      }
      currentQuestion.expected_answer = normalizeValue(answerMatch[1]);
      activeMultilineField = null;
      return;
    }

    const notesMatch = line.match(/^\s*@notes?\s*:\s*(.*)$/i);
    if (notesMatch) {
      if (!currentQuestion) {
        errors.push(createError(lineNumber, trimmed, 'Notes line must come after a question.'));
        return;
      }
      currentQuestion.notes = normalizeValue(notesMatch[1]);
      activeMultilineField = { target: currentQuestion, key: 'notes' };
      return;
    }

    const attachMatch = trimmed.match(/^@attach(?:ed\s+proofs?)?\s*:\s*(.+)$/i);
    if (attachMatch) {
      if (!currentQuestion) {
        errors.push(createError(lineNumber, trimmed, 'Attach line must come after a question.'));
        return;
      }

      const attachedNames = parseAttachedProofNames(attachMatch[1]);
      const missingNames = [];
      const attachedIds = attachedNames.flatMap((name) => {
        const matchedProof = attachmentProofLookup.get(normalizeKey(name)) || null;
        if (!matchedProof) {
          missingNames.push(name);
          return [];
        }
        return [matchedProof.id];
      });

      if (missingNames.length > 0) {
        errors.push(createError(lineNumber, trimmed, `Attached proof not found: ${missingNames.join(', ')}.`));
      }

      currentQuestion.attached_proof_ids = attachedIds;
      activeMultilineField = null;
      return;
    }

    errors.push(createError(lineNumber, trimmed, 'Line format not recognized.'));
  });

  return {
    rootItems: rootItems.filter((root) => root.root_item_name),
    errors,
  };
}