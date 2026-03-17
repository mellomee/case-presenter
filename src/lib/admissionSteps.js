export const ADMISSION_STEPS = [
  { key: '1', label: 'Step 1', title: 'Mark the Exhibit', sub: false },
  { key: '2', label: 'Step 2', title: 'Request Witness Review', sub: false },
  { key: '3', label: 'Step 3', title: 'Authenticate (Intro)', sub: false },
  { key: '3.1', label: 'Step 3.1', title: 'Identification', sub: true },
  { key: '3.2', label: 'Step 3.2', title: 'Description', sub: true },
  { key: '3.3', label: 'Step 3.3', title: 'Authentication', sub: true },
  { key: '3.4', label: 'Step 3.4', title: 'Accuracy', sub: true },
  { key: '3.5', label: 'Step 3.5', title: 'Helpfulness / Relevance', sub: true },
  { key: '4', label: 'Step 4', title: 'Move for Admission', sub: false },
  { key: '5', label: 'Step 5', title: 'Publish to Jury', sub: false },
];

export function fillExhibitPlaceholder(text = '', exhibitNum = '') {
  return String(text || '').replace(/\{\{exhibit_num\}\}/g, exhibitNum || '[Exhibit #]');
}

export function resolveAdmissionStepText(block, templates, stepKey) {
  const overrideText = block?.step_overrides?.[stepKey]?.text;
  if (overrideText) return overrideText;

  const template = templates.find(
    (item) => item.proof_type_category_id === block?.proof_type_category_id && item.step === stepKey
  );

  return template?.default_text || '';
}

export function buildAdmissionSteps(block, templates = [], exhibitNum = '') {
  return ADMISSION_STEPS.map((step) => ({
    ...step,
    text: fillExhibitPlaceholder(resolveAdmissionStepText(block, templates, step.key), exhibitNum),
  }));
}