import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import {
  normalizeProofIds,
  renderBlockPathSectionsHtml,
  renderBlockPathSectionsReact,
  renderQuestionGroupsHtml,
  renderQuestionGroupsReact,
} from '@/components/examBuilder/printStructureUtils.jsx';

const STEPS = [
  { key: '1', label: 'Step 1', title: 'Mark the Exhibit' },
  { key: '2', label: 'Step 2', title: 'Request Witness Review' },
  { key: '3', label: 'Step 3', title: 'Authenticate (Intro)' },
  { key: '3.1', label: 'Step 3.1', title: 'Identification' },
  { key: '3.2', label: 'Step 3.2', title: 'Description' },
  { key: '3.3', label: 'Step 3.3', title: 'Authentication' },
  { key: '3.4', label: 'Step 3.4', title: 'Accuracy' },
  { key: '3.5', label: 'Step 3.5', title: 'Helpfulness / Relevance' },
  { key: '4', label: 'Step 4', title: 'Move for Admission' },
  { key: '5', label: 'Step 5', title: 'Publish to Jury' },
];

function fillExhibitNum(text, exhibitNum) {
  return (text || '').replace(/\{\{exhibit_num\}\}/g, exhibitNum || '[Exhibit #]');
}

function buildFlatItems(buckets, questions, admissionBlocks, proofs, admissionTemplates, trialPoints) {
  const items = [];

  for (const bucket of buckets) {
    const trialPoint = trialPoints.find((tp) => tp.id === bucket.trial_point_id);

    const bucketQuestions = questions
      .filter((question) => question.bucket_id === bucket.id && !question.parent_question_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const bucketBlocks = admissionBlocks
      .filter((block) => block.bucket_id === bucket.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const mergedItems = [
      ...bucketQuestions.map((question) => ({ type: 'question', data: question, bucket, trialPoint })),
      ...bucketBlocks.map((block) => ({ type: 'block', data: block, bucket, trialPoint })),
    ].sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));

    for (const item of mergedItems) {
      if (item.type === 'question') {
        const attachedProofs = normalizeProofIds(item.data.proof_ids)
          .map((proofId) => proofs.find((proof) => proof.id === proofId))
          .filter(Boolean);

        items.push({ ...item, attachedProofs });
        continue;
      }

      const proof = proofs.find((proofItem) => proofItem.id === item.data.proof_id);
      const exhibitNum = proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num || '';
      const steps = STEPS.map((step) => {
        const overrideText = item.data.step_overrides?.[step.key]?.text;
        const template = admissionTemplates.find((entry) => entry.proof_type_category_id === item.data.proof_type_category_id && entry.step === step.key);
        const rawText = overrideText ?? template?.default_text ?? '';
        return { ...step, text: fillExhibitNum(rawText, exhibitNum), isOverride: !!overrideText };
      });

      items.push({ ...item, proof, exhibitNum, steps });
    }
  }

  return items;
}

function CardPreview({ item, index, total, allQuestions, allProofs, isNext = false }) {
  const isBlock = item.type === 'block';

  return (
    <div
      style={{
        fontFamily: 'Georgia, serif',
        border: isNext ? '1px dashed #94a3b8' : '1px solid #1e293b',
        borderRadius: '8px',
        padding: isNext ? '12px 16px' : '20px 24px',
        background: isNext ? '#f8fafc' : '#fff',
        opacity: isNext ? 0.75 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '11px', fontFamily: 'sans-serif', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {item.bucket?.name}{item.trialPoint ? ` · ${item.trialPoint.name}` : ''}
          </span>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'sans-serif', color: '#94a3b8' }}>
          {isNext ? 'NEXT' : `${index + 1} / ${total}`}
        </span>
      </div>

      {isBlock ? (
        <div>
          <div style={{ fontSize: isNext ? '13px' : '15px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            📋 Admission Block — {item.proof?.formal_name || item.proof?.name || 'Unknown Proof'}
          </div>
          {!isNext && (
            <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>
              {item.steps.filter((step) => step.text).map((step) => (
                <div key={step.key} style={{ marginBottom: '6px', paddingLeft: '8px', borderLeft: step.isOverride ? '2px solid #f59e0b' : '2px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 700, color: '#6b7280', marginRight: '6px' }}>{step.label}</span>
                  <span>{step.text}</span>
                </div>
              ))}
              {renderBlockPathSectionsReact(item.data, allProofs)}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: isNext ? '14px' : '20px', fontWeight: 600, color: '#0f172a', lineHeight: 1.5, margin: '0 0 10px 0' }}>
            {item.data.text}
          </p>

          {!isNext && item.data.expected_answer && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Expected Answer</span>
              <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>{item.data.expected_answer}</p>
            </div>
          )}

          {!isNext && item.data.notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Notes</span>
              <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>{item.data.notes}</p>
            </div>
          )}

          {!isNext && item.attachedProofs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              {item.attachedProofs.map((proof) => (
                <span key={proof.id} style={{ fontSize: '11px', fontFamily: 'sans-serif', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>
                  {proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num ? `Ex ${proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num} — ` : ''}
                  {proof.formal_name || proof.name}
                </span>
              ))}
            </div>
          )}

          {!isNext && renderQuestionGroupsReact(item.data.id, allQuestions, allProofs)}
        </div>
      )}
    </div>
  );
}

export default function PrintQuestionsTrialModal({ open, onClose, party, examType, buckets, questions, admissionBlocks, proofs, admissionTemplates, trialPoints }) {
  const flatItems = buildFlatItems(buckets, questions, admissionBlocks, proofs, admissionTemplates, trialPoints);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const pages = flatItems.map((item, index) => {
      const nextItem = flatItems[index + 1] || null;
      const trialPointText = item.trialPoint ? ` · ${item.trialPoint.name}` : '';

      const headerHtml = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <span style="font-size:11px;font-family:sans-serif;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${item.bucket?.name}${trialPointText}</span>
        <span style="font-size:11px;font-family:sans-serif;color:#94a3b8;">${index + 1} / ${flatItems.length}</span>
      </div>`;

      let mainHtml = '';
      if (item.type === 'block') {
        mainHtml = `<div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:10px;">📋 Admission Block — ${item.proof?.formal_name || item.proof?.name || 'Unknown'}</div>
          ${item.steps.filter((step) => step.text).map((step) => `
            <div style="margin-bottom:8px;padding-left:8px;border-left:${step.isOverride ? '2px solid #f59e0b' : '2px solid #e2e8f0'};">
              <span style="font-size:10px;font-family:sans-serif;font-weight:700;color:#6b7280;margin-right:6px;">${step.label}</span>
              <span style="font-size:14px;">${step.text}</span>
            </div>`).join('')}
          ${renderBlockPathSectionsHtml(item.data, proofs)}`;
      } else {
        mainHtml = `<p style="font-size:22px;font-weight:600;color:#0f172a;line-height:1.5;margin:0 0 12px 0;">${item.data.text}</p>`;

        if (item.data.expected_answer) {
          mainHtml += `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 12px;margin-bottom:10px;">
            <span style="font-size:10px;font-family:sans-serif;font-weight:700;color:#16a34a;text-transform:uppercase;display:block;margin-bottom:2px;">Expected Answer</span>
            <p style="font-size:13px;color:#15803d;margin:0;">${item.data.expected_answer}</p>
          </div>`;
        }

        if (item.data.notes) {
          mainHtml += `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:10px;">
            <span style="font-size:10px;font-family:sans-serif;font-weight:700;color:#d97706;text-transform:uppercase;display:block;margin-bottom:2px;">Notes</span>
            <p style="font-size:13px;color:#92400e;margin:0;">${item.data.notes}</p>
          </div>`;
        }

        if (item.attachedProofs.length > 0) {
          mainHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">${item.attachedProofs.map((proof) => `<span style="font-size:11px;font-family:sans-serif;background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:2px 8px;font-weight:600;">${proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num ? `Ex ${proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num} — ` : ''}${proof.formal_name || proof.name}</span>`).join('')}</div>`;
        }

        mainHtml += renderQuestionGroupsHtml(item.data.id, questions, proofs);
      }

      let nextHtml = '';
      if (nextItem) {
        const nextText = nextItem.type === 'block'
          ? `📋 Admission Block — ${nextItem.proof?.formal_name || nextItem.proof?.name || 'Unknown'}`
          : nextItem.data.text;

        nextHtml = `<div style="margin-top:auto;padding-top:16px;">
          <div style="border:1px dashed #94a3b8;border-radius:6px;padding:10px 14px;background:#f8fafc;opacity:0.8;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:10px;font-family:sans-serif;color:#64748b;font-weight:600;text-transform:uppercase;">${nextItem.bucket?.name}${nextItem.trialPoint ? ` · ${nextItem.trialPoint.name}` : ''}</span>
              <span style="font-size:10px;font-family:sans-serif;color:#94a3b8;">NEXT</span>
            </div>
            <p style="font-size:14px;color:#475569;margin:0;font-style:italic;">${nextText}</p>
          </div>
        </div>`;
      }

      return `<div style="page-break-after:always;min-height:100vh;padding:40px;display:flex;flex-direction:column;box-sizing:border-box;font-family:Georgia,serif;">
        <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #1e293b;">
          <span style="font-size:13px;font-family:sans-serif;font-weight:700;color:#1e293b;">${party?.first_name} ${party?.last_name}</span>
          <span style="font-size:13px;font-family:sans-serif;color:#64748b;margin-left:8px;">${examType} Examination</span>
        </div>
        ${headerHtml}
        <div style="flex:1;">${mainHtml}</div>
        ${nextHtml}
      </div>`;
    }).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Trial Questions — ${party?.first_name} ${party?.last_name} (${examType})</title>
      <style>@media print { @page { margin: 0; } body { margin: 0; } }</style>
    </head><body>${pages}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Trial View — {party?.first_name} {party?.last_name} ({examType})
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b border-slate-200 flex-shrink-0">
          <p className="text-sm text-slate-600">{flatItems.length} pages · nested follow-ups and block paths included</p>
          <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 px-1">
          {flatItems.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No questions to print.</p>
          ) : (
            flatItems.map((item, index) => (
              <div key={item.data.id} className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide pl-1">
                  Page {index + 1}
                </div>
                <CardPreview item={item} index={index} total={flatItems.length} allQuestions={questions} allProofs={proofs} />
                {flatItems[index + 1] && (
                  <CardPreview item={flatItems[index + 1]} index={index + 1} total={flatItems.length} allQuestions={questions} allProofs={proofs} isNext />
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}