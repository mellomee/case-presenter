import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import {
  normalizeProofIds,
  renderBlockPathSectionsReact,
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
        @media print { body { margin: 20px; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  let questionCounter = 0;

  const renderBuckets = () => {
    return buckets.map((bucket) => {
      const trialPoint = trialPoints.find((tp) => tp.id === bucket.trial_point_id);
      const bucketQuestions = questions
        .filter((question) => question.bucket_id === bucket.id && !question.parent_question_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const bucketBlocks = admissionBlocks
        .filter((block) => block.bucket_id === bucket.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const mergedItems = [
        ...bucketQuestions.map((question) => ({ type: 'question', data: question })),
        ...bucketBlocks.map((block) => ({ type: 'block', data: block })),
      ].sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));

      if (mergedItems.length === 0) return null;

      return (
        <div key={bucket.id} style={{ marginBottom: '20px' }}>
          {trialPoint && (
            <div style={{ fontSize: '11px', fontFamily: 'sans-serif', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              📍 {trialPoint.name}
            </div>
          )}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #1e293b', paddingBottom: '5px', marginBottom: '10px', fontFamily: 'sans-serif' }}>
            {bucket.name}
          </div>

          {mergedItems.map((item) => {
            if (item.type === 'question') {
              questionCounter += 1;
              const question = item.data;
              const attachedProofs = normalizeProofIds(question.proof_ids)
                .map((proofId) => proofs.find((proof) => proof.id === proofId))
                .filter(Boolean);

              return (
                <div key={question.id} style={{ marginBottom: '12px', paddingLeft: '4px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'sans-serif', fontWeight: 700, color: '#94a3b8', minWidth: '28px', paddingTop: '2px' }}>{questionCounter}.</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#0f172a', lineHeight: 1.5 }}>{question.text}</p>
                      {question.expected_answer && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#16a34a' }}>✓ {question.expected_answer}</p>
                      )}
                      {question.notes && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#d97706', fontStyle: 'italic' }}>📝 {question.notes}</p>
                      )}
                      {attachedProofs.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          {attachedProofs.map((proof) => (
                            <span key={proof.id} style={{ display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 600, borderRadius: '3px', padding: '1px 6px', marginRight: '4px', marginTop: '2px' }}>
                              {proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num ? `Ex ${proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num} — ` : ''}
                              {proof.formal_name || proof.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {renderQuestionGroupsReact(question.id, questions, proofs)}
                    </div>
                  </div>
                </div>
              );
            }

            const block = item.data;
            const proof = proofs.find((proofItem) => proofItem.id === block.proof_id);
            const exhibitNum = proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num || '';
            const steps = STEPS.map((step) => {
              const overrideText = block.step_overrides?.[step.key]?.text;
              const template = admissionTemplates.find((entry) => entry.proof_type_category_id === block.proof_type_category_id && entry.step === step.key);
              const rawText = overrideText ?? template?.default_text ?? '';
              return { ...step, text: fillExhibitNum(rawText, exhibitNum), isOverride: !!overrideText };
            }).filter((step) => step.text);

            return (
              <div key={block.id} style={{ marginBottom: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'sans-serif', marginBottom: '8px' }}>
                  📋 Admission Block — {proof?.formal_name || proof?.name || 'Unknown'}
                  {exhibitNum && <span style={{ fontWeight: 400, color: '#1d4ed8', marginLeft: '8px', fontFamily: 'monospace' }}>[{exhibitNum}]</span>}
                </div>
                {steps.map((step) => (
                  <div key={step.key} style={{ marginBottom: '5px', paddingLeft: '10px', borderLeft: step.isOverride ? '2px solid #f59e0b' : '2px solid #e2e8f0' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 700, color: '#6b7280', marginRight: '6px' }}>{step.label}</span>
                    <span style={{ fontSize: '13px' }}>{step.text}</span>
                  </div>
                ))}
                {renderBlockPathSectionsReact(block, proofs)}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Question List — {party?.first_name} {party?.last_name} ({examType})
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b border-slate-200 flex-shrink-0">
          <p className="text-sm text-slate-600">
            {buckets.length} buckets · {questions.length} questions incl. follow-ups · {admissionBlocks.length} admission blocks
          </p>
          <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>

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