import React from 'react';

const GROUP_ORDER = ['Forgot', 'Deny', 'Other'];
const GROUP_LABELS = {
  Forgot: 'Forgot',
  Deny: 'Deny',
  Other: 'Other Follow-ups',
};

const PATH_SECTIONS = [
  { key: 'admitted', label: 'Path 1 — Admitted' },
  { key: 'not_admitted', label: 'Path 2 — Not Admitted' },
];

function sortByOrder(a, b) {
  return (a?.sort_order || 0) - (b?.sort_order || 0);
}

export function normalizeProofIds(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && Array.isArray(value.ids)) return value.ids.filter(Boolean);
  return [];
}

function parsePathQuestionSets(value) {
  if (!value) return { admitted: [], not_admitted: [] };
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { admitted: [], not_admitted: [] };
    }
  }
  return value;
}

function getAttachedProofs(item, proofs) {
  return normalizeProofIds(item?.proof_ids)
    .map((proofId) => proofs.find((proof) => proof.id === proofId))
    .filter(Boolean);
}

function formatProofLabel(proof) {
  const exhibitNum = proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num;
  const proofName = proof?.formal_name || proof?.name || 'Unnamed Proof';
  return exhibitNum ? `Ex ${exhibitNum} — ${proofName}` : proofName;
}

function groupChildQuestions(children) {
  const groups = { Forgot: [], Deny: [], Other: [] };

  children.forEach((child) => {
    if (child?.follow_up_group === 'Forgot') groups.Forgot.push(child);
    else if (child?.follow_up_group === 'Deny') groups.Deny.push(child);
    else groups.Other.push(child);
  });

  return groups;
}

function getQuestionChildren(questions, parentQuestionId) {
  return questions
    .filter((question) => question.parent_question_id === parentQuestionId)
    .sort(sortByOrder);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderProofBadgesReact(proofs) {
  if (!proofs.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
      {proofs.map((proof) => (
        <span
          key={proof.id}
          style={{
            display: 'inline-block',
            background: '#dbeafe',
            color: '#1d4ed8',
            fontSize: '10px',
            fontFamily: 'sans-serif',
            fontWeight: 600,
            borderRadius: '3px',
            padding: '1px 6px',
          }}
        >
          {formatProofLabel(proof)}
        </span>
      ))}
    </div>
  );
}

function renderProofBadgesHtml(proofs) {
  if (!proofs.length) return '';

  return `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">${proofs
    .map(
      (proof) =>
        `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:10px;font-family:sans-serif;font-weight:600;border-radius:3px;padding:1px 6px;">${escapeHtml(formatProofLabel(proof))}</span>`
    )
    .join('')}</div>`;
}

function QuestionNodeReact({ question, questions, proofs, depth }) {
  const childQuestions = getQuestionChildren(questions, question.id);
  const groups = groupChildQuestions(childQuestions);
  const attachedProofs = getAttachedProofs(question, proofs);
  const marginLeft = Math.max(0, depth - 1) * 18;

  return (
    <div style={{ marginTop: '6px', marginLeft: `${marginLeft}px` }}>
      <div style={{ paddingLeft: '12px', borderLeft: '2px solid #e2e8f0' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontStyle: 'italic', lineHeight: 1.45 }}>
          ↳ {question.text}
        </p>
        {question.expected_answer && (
          <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#16a34a' }}>✓ {question.expected_answer}</p>
        )}
        {question.notes && (
          <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#d97706', fontStyle: 'italic' }}>📝 {question.notes}</p>
        )}
        {renderProofBadgesReact(attachedProofs)}
      </div>

      {GROUP_ORDER.map((groupKey) => {
        if (!groups[groupKey].length) return null;

        return (
          <div key={`${question.id}-${groupKey}`} style={{ marginTop: '6px', marginLeft: '12px' }}>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'sans-serif',
                fontWeight: 700,
                color: groupKey === 'Forgot' ? '#166534' : groupKey === 'Deny' ? '#991b1b' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '2px',
              }}
            >
              {GROUP_LABELS[groupKey]}
            </div>
            {groups[groupKey].map((child) => (
              <QuestionNodeReact
                key={child.id}
                question={child}
                questions={questions}
                proofs={proofs}
                depth={depth + 1}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function renderQuestionNodeHtml(question, questions, proofs, depth) {
  const childQuestions = getQuestionChildren(questions, question.id);
  const groups = groupChildQuestions(childQuestions);
  const attachedProofs = getAttachedProofs(question, proofs);
  const marginLeft = Math.max(0, depth - 1) * 18;

  const groupHtml = GROUP_ORDER.map((groupKey) => {
    if (!groups[groupKey].length) return '';

    const labelColor = groupKey === 'Forgot' ? '#166534' : groupKey === 'Deny' ? '#991b1b' : '#64748b';

    return `<div style="margin-top:6px;margin-left:12px;">
      <div style="font-size:10px;font-family:sans-serif;font-weight:700;color:${labelColor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">${escapeHtml(GROUP_LABELS[groupKey])}</div>
      ${groups[groupKey].map((child) => renderQuestionNodeHtml(child, questions, proofs, depth + 1)).join('')}
    </div>`;
  }).join('');

  return `<div style="margin-top:6px;margin-left:${marginLeft}px;">
    <div style="padding-left:12px;border-left:2px solid #e2e8f0;">
      <p style="margin:0;font-size:13px;color:#475569;font-style:italic;line-height:1.45;">↳ ${escapeHtml(question.text)}</p>
      ${question.expected_answer ? `<p style="margin:3px 0 0 0;font-size:11px;color:#16a34a;">✓ ${escapeHtml(question.expected_answer)}</p>` : ''}
      ${question.notes ? `<p style="margin:3px 0 0 0;font-size:11px;color:#d97706;font-style:italic;">📝 ${escapeHtml(question.notes)}</p>` : ''}
      ${renderProofBadgesHtml(attachedProofs)}
    </div>
    ${groupHtml}
  </div>`;
}

export function renderQuestionGroupsReact(parentQuestionId, questions, proofs) {
  const childQuestions = getQuestionChildren(questions, parentQuestionId);
  if (!childQuestions.length) return null;

  const groups = groupChildQuestions(childQuestions);

  return (
    <div style={{ marginTop: '8px' }}>
      {GROUP_ORDER.map((groupKey) => {
        if (!groups[groupKey].length) return null;

        return (
          <div key={`${parentQuestionId}-${groupKey}`} style={{ marginTop: '8px' }}>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'sans-serif',
                fontWeight: 700,
                color: groupKey === 'Forgot' ? '#166534' : groupKey === 'Deny' ? '#991b1b' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}
            >
              {GROUP_LABELS[groupKey]}
            </div>
            {groups[groupKey].map((child) => (
              <QuestionNodeReact key={child.id} question={child} questions={questions} proofs={proofs} depth={1} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function renderQuestionGroupsHtml(parentQuestionId, questions, proofs) {
  const childQuestions = getQuestionChildren(questions, parentQuestionId);
  if (!childQuestions.length) return '';

  const groups = groupChildQuestions(childQuestions);

  return `<div style="margin-top:8px;">${GROUP_ORDER.map((groupKey) => {
    if (!groups[groupKey].length) return '';
    const labelColor = groupKey === 'Forgot' ? '#166534' : groupKey === 'Deny' ? '#991b1b' : '#64748b';

    return `<div style="margin-top:8px;">
      <div style="font-size:10px;font-family:sans-serif;font-weight:700;color:${labelColor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${escapeHtml(GROUP_LABELS[groupKey])}</div>
      ${groups[groupKey].map((child) => renderQuestionNodeHtml(child, questions, proofs, 1)).join('')}
    </div>`;
  }).join('')}</div>`;
}

function PathNodeReact({ node, proofs, depth }) {
  const attachedProofs = getAttachedProofs(node, proofs);
  const children = Array.isArray(node?.children) ? node.children : [];

  return (
    <div style={{ marginTop: '6px', marginLeft: `${depth * 18}px` }}>
      <div style={{ paddingLeft: '12px', borderLeft: '2px solid #e2e8f0' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
          {depth > 0 ? '↳ ' : ''}{node.text}
        </p>
        {node.expected_answer && (
          <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#16a34a' }}>✓ {node.expected_answer}</p>
        )}
        {node.notes && (
          <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#d97706', fontStyle: 'italic' }}>📝 {node.notes}</p>
        )}
        {renderProofBadgesReact(attachedProofs)}
      </div>
      {children.map((child, index) => (
        <PathNodeReact key={child.id || `${node.text}-${index}`} node={child} proofs={proofs} depth={depth + 1} />
      ))}
    </div>
  );
}

function renderPathNodeHtml(node, proofs, depth) {
  const attachedProofs = getAttachedProofs(node, proofs);
  const children = Array.isArray(node?.children) ? node.children : [];

  return `<div style="margin-top:6px;margin-left:${depth * 18}px;">
    <div style="padding-left:12px;border-left:2px solid #e2e8f0;">
      <p style="margin:0;font-size:13px;color:#334155;line-height:1.45;">${depth > 0 ? '↳ ' : ''}${escapeHtml(node.text)}</p>
      ${node.expected_answer ? `<p style="margin:3px 0 0 0;font-size:11px;color:#16a34a;">✓ ${escapeHtml(node.expected_answer)}</p>` : ''}
      ${node.notes ? `<p style="margin:3px 0 0 0;font-size:11px;color:#d97706;font-style:italic;">📝 ${escapeHtml(node.notes)}</p>` : ''}
      ${renderProofBadgesHtml(attachedProofs)}
    </div>
    ${children.map((child) => renderPathNodeHtml(child, proofs, depth + 1)).join('')}
  </div>`;
}

export function renderBlockPathSectionsReact(block, proofs) {
  const pathQuestionSets = parsePathQuestionSets(block?.path_question_sets);
  const hasAnyPaths = PATH_SECTIONS.some(({ key }) => Array.isArray(pathQuestionSets?.[key]) && pathQuestionSets[key].length > 0);

  if (!hasAnyPaths) return null;

  return (
    <div style={{ marginTop: '10px' }}>
      {PATH_SECTIONS.map(({ key, label }) => {
        const nodes = Array.isArray(pathQuestionSets?.[key]) ? pathQuestionSets[key] : [];
        if (!nodes.length) return null;

        return (
          <div key={key} style={{ marginTop: '8px' }}>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'sans-serif',
                fontWeight: 700,
                color: '#4338ca',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}
            >
              {label}
            </div>
            {nodes.map((node, index) => (
              <PathNodeReact key={node.id || `${key}-${index}`} node={node} proofs={proofs} depth={0} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function renderBlockPathSectionsHtml(block, proofs) {
  const pathQuestionSets = parsePathQuestionSets(block?.path_question_sets);
  const hasAnyPaths = PATH_SECTIONS.some(({ key }) => Array.isArray(pathQuestionSets?.[key]) && pathQuestionSets[key].length > 0);

  if (!hasAnyPaths) return '';

  return `<div style="margin-top:10px;">${PATH_SECTIONS.map(({ key, label }) => {
    const nodes = Array.isArray(pathQuestionSets?.[key]) ? pathQuestionSets[key] : [];
    if (!nodes.length) return '';

    return `<div style="margin-top:8px;">
      <div style="font-size:10px;font-family:sans-serif;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${escapeHtml(label)}</div>
      ${nodes.map((node) => renderPathNodeHtml(node, proofs, 0)).join('')}
    </div>`;
  }).join('')}</div>`;
}