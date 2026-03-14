import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

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

// Build flat ordered list of items for a party+examType
function buildFlatItems(buckets, questions, admissionBlocks, proofs, admissionTemplates, trialPoints) {
  const items = [];

  for (const bucket of buckets) {
    const trialPoint = trialPoints.find(tp => tp.id === bucket.trial_point_id);

    const bucketQs = questions
      .filter(q => q.bucket_id === bucket.id && !q.parent_question_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const bucketBlocks = admissionBlocks
      .filter(ab => ab.bucket_id === bucket.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const merged = [
      ...bucketQs.map(q => ({ type: 'question', data: q, bucket, trialPoint })),
      ...bucketBlocks.map(ab => ({ type: 'block', data: ab, bucket, trialPoint })),
    ].sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));

    for (const item of merged) {
      if (item.type === 'question') {
        const attachedProofs = (Array.isArray(item.data.proof_ids) ? item.data.proof_ids : [])
          .map(pid => proofs.find(p => p.id === pid))
          .filter(Boolean);

        const childQs = questions
          .filter(q => q.parent_question_id === item.data.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        items.push({ ...item, attachedProofs, childQs });
      } else {
        const proof = proofs.find(p => p.id === item.data.proof_id);
        const exhibitNum = proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num || '';

        const steps = STEPS.map(step => {
          const overrideText = item.data.step_overrides?.[step.key]?.text;
          const tmpl = admissionTemplates.find(t =>
            t.proof_type_category_id === item.data.proof_type_category_id && t.step === step.key
          );
          const rawText = overrideText ?? tmpl?.default_text ?? '';
          return { ...step, text: fillExhibitNum(rawText, exhibitNum), isOverride: !!overrideText };
        });

        items.push({ ...item, proof, exhibitNum, steps });
      }
    }
  }

  return items;
}

function CardPreview({ item, index, total, isNext = false }) {
  const isBlock = item.type === 'block';
  const isQuestion = item.type === 'question';

  return (
    <div
      style={{
        fontFamily: 'Georgia, serif',
        border: isNext ? '1px dashed #94a3b8' : '1px solid #1e293b',
        borderRadius: '8px',
        padding: isNext ? '12px 16px' : '20px 24px',
        marginBottom: isNext ? '0' : '0',
        background: isNext ? '#f8fafc' : '#fff',
        opacity: isNext ? 0.75 : 1,
      }}
    >
      {/* Header */}
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
              {item.steps.filter(s => s.text).map(s => (
                <div key={s.key} style={{ marginBottom: '6px', paddingLeft: '8px', borderLeft: s.isOverride ? '2px solid #f59e0b' : '2px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 700, color: '#6b7280', marginRight: '6px' }}>{s.label}</span>
                  <span>{s.text}</span>
                </div>
              ))}
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

          {!isNext && item.attachedProofs?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              {item.attachedProofs.map(p => (
                <span key={p.id} style={{ fontSize: '11px', fontFamily: 'sans-serif', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>
                  {p.admitted_exhibit_num || p.joint_exhibit_num ? `Ex ${p.admitted_exhibit_num || p.joint_exhibit_num} — ` : ''}{p.formal_name || p.name}
                </span>
              ))}
            </div>
          )}

          {!isNext && item.childQs?.length > 0 && (
            <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid #e2e8f0' }}>
              {item.childQs.map((cq, ci) => (
                <p key={cq.id} style={{ fontSize: '13px', color: '#475569', margin: '4px 0', fontStyle: 'italic' }}>
                  ↳ {cq.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PrintQuestionsTrialModal({ open, onClose, party, examType, buckets, questions, admissionBlocks, proofs, admissionTemplates, trialPoints }) {
  const printRef = useRef(null);

  const flatItems = buildFlatItems(buckets, questions, admissionBlocks, proofs, admissionTemplates, trialPoints);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const pages = flatItems.map((item, index) => {
      const nextItem = flatItems[index + 1] || null;
      const isBlock = item.type === 'block';
      const isQuestion = item.type === 'question';

      const trialPointText = item.trialPoint ? ` · ${item.trialPoint.name}` : '';
      const headerHtml = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <span style="font-size:11px;font-family:sans-serif;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${item.bucket?.name}${trialPointText}</span>
        <span style="font-size:11px;font-family:sans-serif;color:#94a3b8;">${index + 1} / ${flatItems.length}</span>
      </div>`;

      let mainHtml = '';
      if (isBlock) {
        mainHtml = `<div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:10px;">📋 Admission Block — ${item.proof?.formal_name || item.proof?.name || 'Unknown'}</div>
          ${item.steps.filter(s => s.text).map(s => `
            <div style="margin-bottom:8px;padding-left:8px;border-left:${s.isOverride ? '2px solid #f59e0b' : '2px solid #e2e8f0'};">
              <span style="font-size:10px;font-family:sans-serif;font-weight:700;color:#6b7280;margin-right:6px;">${s.label}</span>
              <span style="font-size:14px;">${s.text}</span>
            </div>`).join('')}`;
      } else {
        mainHtml = `<p style="font-size:22px;font-weight:600;color:#0f172a;line-height:1.5;margin:0 0 12px 0;">${item.data.text}</p>`;
        if (item.data.expected_answer) {
          mainHtml += `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 12px;margin-bottom:10px;">
            <span style="font-size:10px;font-family:sans-serif;font-weight:700;color:#16a34a;text-transform:uppercase;display:block;margin-bottom:2px;">Expected Answer</span>
            <p style="font-size:13px;color:#15803d;margin:0;">${item.data.expected_answer}</p></div>`;
        }
        if (item.data.notes) {
          mainHtml += `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:10px;">
            <span style="font-size:10px;font-family:sans-serif;font-weight:700;color:#d97706;text-transform:uppercase;display:block;margin-bottom:2px;">Notes</span>
            <p style="font-size:13px;color:#92400e;margin:0;">${item.data.notes}</p></div>`;
        }
        if (item.attachedProofs?.length > 0) {
          mainHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">${item.attachedProofs.map(p => `<span style="font-size:11px;font-family:sans-serif;background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:2px 8px;font-weight:600;">${p.admitted_exhibit_num || p.joint_exhibit_num ? `Ex ${p.admitted_exhibit_num || p.joint_exhibit_num} — ` : ''}${p.formal_name || p.name}</span>`).join('')}</div>`;
        }
        if (item.childQs?.length > 0) {
          mainHtml += `<div style="margin-top:8px;padding-left:12px;border-left:2px solid #e2e8f0;">${item.childQs.map(cq => `<p style="font-size:13px;color:#475569;margin:4px 0;font-style:italic;">↳ ${cq.text}</p>`).join('')}</div>`;
        }
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Trial View — {party?.first_name} {party?.last_name} ({examType})
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b border-slate-200 flex-shrink-0">
          <p className="text-sm text-slate-600">{flatItems.length} items — one question per page with next preview</p>
          <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 px-1">
          {flatItems.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No questions to print.</p>
          ) : (
            flatItems.map((item, index) => (
              <div key={item.data.id} className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide pl-1">
                  Page {index + 1}
                </div>
                <CardPreview item={item} index={index} total={flatItems.length} />
                {flatItems[index + 1] && (
                  <CardPreview item={flatItems[index + 1]} index={index + 1} total={flatItems.length} isNext />
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}