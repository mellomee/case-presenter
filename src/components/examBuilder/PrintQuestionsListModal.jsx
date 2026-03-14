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

function renderQuestionTree(question, questions, depth = 0) {
  const children = questions
    .filter(q => q.parent_question_id === question.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const indent = depth * 20;
  const isChild = depth > 0;

  return (
    <div key={question.id} style={{ marginBottom: '8px', paddingLeft: `${indent}px` }}>
      <p style={{ margin: 0, fontSize: isChild ? '13px' : '14px', color: isChild ? '#475569' : '#0f172a', fontStyle: isChild ? 'italic' : 'normal' }}>
        {isChild ? '↳ ' : ''}{question.text}
      </p>
      {question.expected_answer && (
        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#16a34a', paddingLeft: isChild ? '0' : '12px' }}>
          ✓ {question.expected_answer}
        </p>
      )}
      {question.notes && (
        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#d97706', paddingLeft: isChild ? '0' : '12px', fontStyle: 'italic' }}>
          📝 {question.notes}
        </p>
      )}
      {children.map(child => renderQuestionTree(child, questions, depth + 1))}
    </div>
  );
}

export default function PrintQuestionsListModal({ open, onClose, party, examType, buckets, questions, admissionBlocks, proofs, admissionTemplates, trialPoints }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Question List — ${party?.first_name} ${party?.last_name} (${examType})</title>
      <style>
        body { font-family: Georgia, serif; color: #0f172a; margin: 40px; font-size: 14px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
        .bucket-header { font-size: 15px; font-weight: 700; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 6px; margin: 24px 0 10px 0; font-family: sans-serif; }
        .trial-point { font-size: 11px; color: #64748b; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .q-num { font-size: 11px; font-family: sans-serif; font-weight: 700; color: #94a3b8; margin-right: 6px; }
        .block-header { font-size: 13px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 6px; font-family: sans-serif; }
        .step-row { padding: 3px 0 3px 14px; border-left: 2px solid #e2e8f0; margin-bottom: 3px; font-size: 12px; color: #374151; }
        .step-label { font-family: sans-serif; font-size: 10px; font-weight: 700; color: #6b7280; margin-right: 6px; }
        .expected { color: #16a34a; font-size: 12px; margin: 2px 0 0 14px; }
        .notes { color: #d97706; font-size: 11px; margin: 2px 0 0 14px; font-style: italic; }
        .child-q { color: #475569; font-size: 13px; font-style: italic; margin: 4px 0 2px 20px; }
        .proof-tag { display:inline-block; background:#dbeafe; color:#1d4ed8; font-size:10px; font-family:sans-serif; font-weight:600; border-radius:3px; padding:1px 6px; margin: 2px 2px 0 14px; }
        @media print { body { margin: 20px; } .bucket-header { page-break-before: auto; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  let questionCounter = 0;

  const renderBuckets = () => {
    return buckets.map(bucket => {
      const trialPoint = trialPoints.find(tp => tp.id === bucket.trial_point_id);
      const bucketQs = questions
        .filter(q => q.bucket_id === bucket.id && !q.parent_question_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const bucketBlocks = admissionBlocks
        .filter(ab => ab.bucket_id === bucket.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const merged = [
        ...bucketQs.map(q => ({ type: 'question', data: q })),
        ...bucketBlocks.map(ab => ({ type: 'block', data: ab })),
      ].sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));

      if (merged.length === 0) return null;

      return (
        <div key={bucket.id} style={{ marginBottom: '20px' }}>
          {/* Bucket header */}
          {trialPoint && (
            <div style={{ fontSize: '11px', fontFamily: 'sans-serif', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              📍 {trialPoint.name}
            </div>
          )}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #1e293b', paddingBottom: '5px', marginBottom: '10px', fontFamily: 'sans-serif' }}>
            {bucket.name}
          </div>

          {merged.map(item => {
            if (item.type === 'question') {
              questionCounter++;
              const num = questionCounter;
              const q = item.data;
              const childQs = questions
                .filter(cq => cq.parent_question_id === q.id)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
              const attachedProofs = (Array.isArray(q.proof_ids) ? q.proof_ids : [])
                .map(pid => proofs.find(p => p.id === pid))
                .filter(Boolean);

              return (
                <div key={q.id} style={{ marginBottom: '12px', paddingLeft: '4px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'sans-serif', fontWeight: 700, color: '#94a3b8', minWidth: '28px', paddingTop: '2px' }}>{num}.</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#0f172a', lineHeight: 1.5 }}>{q.text}</p>
                      {q.expected_answer && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#16a34a' }}>✓ {q.expected_answer}</p>
                      )}
                      {q.notes && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#d97706', fontStyle: 'italic' }}>📝 {q.notes}</p>
                      )}
                      {attachedProofs.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          {attachedProofs.map(p => (
                            <span key={p.id} style={{ display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 600, borderRadius: '3px', padding: '1px 6px', marginRight: '4px', marginTop: '2px' }}>
                              {p.admitted_exhibit_num || p.joint_exhibit_num ? `Ex ${p.admitted_exhibit_num || p.joint_exhibit_num} — ` : ''}{p.formal_name || p.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {childQs.map(cq => (
                        <div key={cq.id} style={{ marginTop: '6px', paddingLeft: '16px', borderLeft: '2px solid #e2e8f0' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>↳ {cq.text}</p>
                          {cq.expected_answer && <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#16a34a' }}>✓ {cq.expected_answer}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            } else {
              // Admission Block
              const ab = item.data;
              const proof = proofs.find(p => p.id === ab.proof_id);
              const exhibitNum = proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num || '';

              const steps = STEPS.map(step => {
                const overrideText = ab.step_overrides?.[step.key]?.text;
                const tmpl = admissionTemplates.find(t => t.proof_type_category_id === ab.proof_type_category_id && t.step === step.key);
                const rawText = overrideText ?? tmpl?.default_text ?? '';
                return { ...step, text: fillExhibitNum(rawText, exhibitNum), isOverride: !!overrideText };
              }).filter(s => s.text);

              return (
                <div key={ab.id} style={{ marginBottom: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'sans-serif', marginBottom: '8px' }}>
                    📋 Admission Block — {proof?.formal_name || proof?.name || 'Unknown'}
                    {exhibitNum && <span style={{ fontWeight: 400, color: '#1d4ed8', marginLeft: '8px', fontFamily: 'monospace' }}>[{exhibitNum}]</span>}
                  </div>
                  {steps.map(s => (
                    <div key={s.key} style={{ marginBottom: '5px', paddingLeft: '10px', borderLeft: s.isOverride ? '2px solid #f59e0b' : '2px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 700, color: '#6b7280', marginRight: '6px' }}>{s.label}</span>
                      <span style={{ fontSize: '13px' }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              );
            }
          })}
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Question List — {party?.first_name} {party?.last_name} ({examType})
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b border-slate-200 flex-shrink-0">
          <p className="text-sm text-slate-600">
            {buckets.length} buckets · {questions.filter(q => !q.parent_question_id).length} top-level questions · {admissionBlocks.length} admission blocks
          </p>
          <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <div ref={printRef} style={{ fontFamily: 'Georgia, serif', color: '#0f172a' }}>
            <h1 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>{examType} Examination</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0', fontFamily: 'sans-serif' }}>
              {party?.first_name} {party?.last_name} · Printed {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {(() => { questionCounter = 0; return null; })()}
            {buckets.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>No buckets to print.</p>
            ) : renderBuckets()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}