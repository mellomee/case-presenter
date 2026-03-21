import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import { buildItemTree, getProofDisplayName, parseIdsField } from '@/lib/examV2Utils';

const STEPS = [
  { key: '1', label: 'Step 1' },
  { key: '2', label: 'Step 2' },
  { key: '3', label: 'Step 3' },
  { key: '3.1', label: 'Step 3.1' },
  { key: '3.2', label: 'Step 3.2' },
  { key: '3.3', label: 'Step 3.3' },
  { key: '3.4', label: 'Step 3.4' },
  { key: '3.5', label: 'Step 3.5' },
  { key: '4', label: 'Step 4' },
  { key: '5', label: 'Step 5' },
];

function fillExhibitNum(text, exhibitNum) {
  return String(text || '').replace(/\{\{exhibit_num\}\}/g, exhibitNum || '[Exhibit #]');
}

function getAttachmentStatusLabel(proof) {
  if (proof?.status === 'Admitted') {
    return `As Exhibit${proof.admitted_exhibit_num ? ` · Admitted # ${proof.admitted_exhibit_num}` : ''}${proof.joint_exhibit_num ? ` · Joint # ${proof.joint_exhibit_num}` : ''}`;
  }

  if (proof?.status === 'Demonstrative') {
    return `As Demo${proof.demonstrative_exhibit_num ? ` · Demo # ${proof.demonstrative_exhibit_num}` : ''}${proof.joint_exhibit_num ? ` · Joint # ${proof.joint_exhibit_num}` : ''}`;
  }

  return `Declined Admitted${proof?.joint_exhibit_num ? ` · Joint # ${proof.joint_exhibit_num}` : ''}`;
}

function QuestionBranch({ nodes = [], proofsById = {}, level = 0 }) {
  return nodes.map((node) => {
    const attachedProofs = parseIdsField(node.attached_proof_ids).map((proofId) => proofsById[proofId]).filter(Boolean);

    return (
      <div key={node.id} className="exam-v2-print-question" style={{ marginLeft: `${level * 22}px` }}>
        <div className="exam-v2-print-question-row">
          <span className="exam-v2-print-checkbox">☐</span>
          <div className="exam-v2-print-question-body">
            <p className="exam-v2-print-question-text">{node.text}</p>
            {node.expected_answer && <p className="exam-v2-print-expected">Expected: {node.expected_answer}</p>}
            {node.notes && <p className="exam-v2-print-notes">Notes: {node.notes}</p>}
            {attachedProofs.length > 0 && (
              <div className="exam-v2-print-attachments">
                {attachedProofs.map((proof) => (
                  <div key={proof.id} className="exam-v2-print-attachment-row">
                    <span className="exam-v2-print-attachment-name">{getProofDisplayName(proof)}</span>
                    <span className="exam-v2-print-attachment-meta">{getAttachmentStatusLabel(proof)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {node.children?.length > 0 && <QuestionBranch nodes={node.children} proofsById={proofsById} level={level + 1} />}
      </div>
    );
  });
}

export default function PrintExamV2Dialog({
  open,
  onOpenChange,
  party = null,
  examType = 'Direct',
  rootItems = [],
  currentItems = [],
  proofsById = {},
  admissionTemplates = [],
}) {
  const orderedRootItems = useMemo(
    () => [...rootItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [rootItems]
  );

  const questionItems = useMemo(
    () => currentItems.filter((item) => item.item_type === 'question'),
    [currentItems]
  );

  const admissionScriptByRootId = useMemo(
    () => Object.fromEntries(currentItems.filter((item) => item.item_type === 'admission_script').map((item) => [item.parent_item_id, item])),
    [currentItems]
  );

  const handlePrint = () => {
    window.print();
  };

  const printedDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const partyName = party ? `${party.first_name} ${party.last_name}` : 'No party selected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="exam-v2-print-dialog max-w-6xl max-h-[92vh] overflow-hidden bg-slate-950 border-slate-800 text-white flex flex-col">
        <style>{`
          .exam-v2-print-shell { color: #0f172a; }
          .exam-v2-print-preview { background: #e2e8f0; }
          .exam-v2-print-page { position: relative; min-height: 1100px; margin: 0 auto 24px; background: white; padding: 48px 56px 72px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18); }
          .exam-v2-print-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
          .exam-v2-print-header-copy { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .exam-v2-print-header-title { margin-top: 8px; font-size: 20px; font-weight: 700; color: #0f172a; }
          .exam-v2-print-order-badge { border: 1px solid #cbd5e1; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 700; color: #1e293b; }
          .exam-v2-print-spacer { height: 96px; }
          .exam-v2-print-divider { border-top: 2px solid #0f172a; margin-bottom: 28px; }
          .exam-v2-print-proof-row { display: grid; grid-template-columns: 7rem 1fr; gap: 20px; align-items: start; margin-bottom: 20px; }
          .exam-v2-print-proof-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
          .exam-v2-print-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; }
          .exam-v2-print-pill.joint { background: #dbeafe; color: #1d4ed8; }
          .exam-v2-print-pill.admitted { background: #dcfce7; color: #15803d; }
          .exam-v2-print-pill.demo { background: #f3e8ff; color: #7e22ce; }
          .exam-v2-print-pill.declined { background: #fef3c7; color: #b45309; }
          .exam-v2-print-group-box { border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; margin-bottom: 24px; }
          .exam-v2-print-script { border: 1px solid #cbd5e1; border-radius: 18px; padding: 18px 20px; margin-bottom: 24px; background: #f8fafc; }
          .exam-v2-print-script-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
          .exam-v2-print-script-step { margin-bottom: 8px; font-size: 13px; line-height: 1.55; }
          .exam-v2-print-script-label { display: inline-block; min-width: 72px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          .exam-v2-print-question { margin-bottom: 14px; }
          .exam-v2-print-question-row { display: flex; align-items: flex-start; gap: 10px; }
          .exam-v2-print-checkbox { font-size: 16px; line-height: 1.5; color: #0f172a; }
          .exam-v2-print-question-body { flex: 1; }
          .exam-v2-print-question-text { margin: 0; font-size: 15px; line-height: 1.65; color: #0f172a; }
          .exam-v2-print-expected { margin: 5px 0 0; font-size: 12px; color: #15803d; font-weight: 600; }
          .exam-v2-print-notes { margin: 5px 0 0; font-size: 12px; color: #92400e; }
          .exam-v2-print-attachments { margin-top: 8px; border-left: 2px solid #e2e8f0; padding-left: 10px; }
          .exam-v2-print-attachment-row { margin-top: 4px; }
          .exam-v2-print-attachment-name { display: inline-block; font-size: 12px; font-weight: 700; color: #0f172a; margin-right: 8px; }
          .exam-v2-print-attachment-meta { font-size: 12px; color: #475569; }
          .exam-v2-print-empty { font-size: 13px; color: #64748b; font-style: italic; }
          .exam-v2-print-footer { position: absolute; right: 56px; bottom: 28px; font-size: 12px; color: #64748b; }
          @media print {
            @page { margin: 0.5in; }
            html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
            body * { visibility: hidden !important; }
            .exam-v2-print-dialog,
            .exam-v2-print-dialog *,
            .exam-v2-print-shell,
            .exam-v2-print-shell * { visibility: visible !important; }
            .exam-v2-print-dialog {
              position: static !important;
              inset: auto !important;
              transform: none !important;
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              overflow: visible !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              padding: 0 !important;
              background: white !important;
            }
            .exam-v2-print-dialog > button { display: none !important; }
            .exam-v2-print-shell {
              position: static !important;
              inset: auto !important;
              display: block !important;
              min-height: auto !important;
              background: white !important;
            }
            .exam-v2-print-toolbar { display: none !important; }
            .exam-v2-print-preview {
              background: white !important;
              overflow: visible !important;
              padding: 0 !important;
              border-radius: 0 !important;
            }
            .exam-v2-print-page {
              box-shadow: none !important;
              margin: 0 0 24px 0 !important;
              min-height: auto !important;
              page-break-after: always;
              break-after: page;
            }
            .exam-v2-print-page:last-child { page-break-after: auto; break-after: auto; }
          }
        `}</style>

        <DialogHeader>
          <DialogTitle>Print Exam Builder V2</DialogTitle>
        </DialogHeader>

        <div className="exam-v2-print-shell flex flex-col min-h-0">
          <div className="exam-v2-print-toolbar flex items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4 flex-shrink-0">
            <p className="text-sm text-slate-400">Each exam-order item prints on its own page with page numbers and the party/exam header.</p>
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>

          <div className="exam-v2-print-preview flex-1 overflow-y-auto p-4 rounded-xl bg-slate-900/40">
            {orderedRootItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-10 text-center text-slate-500">
                No exam-order items to print.
              </div>
            ) : (
              orderedRootItems.map((rootItem, index) => {
                const rootProof = rootItem.item_type === 'proof' ? proofsById[rootItem.linked_proof_id] || null : null;
                const admissionScript = admissionScriptByRootId[rootItem.id] || null;
                const questionTree = buildItemTree(questionItems, rootItem.id);
                const exhibitNum = rootProof?.admitted_exhibit_num || rootProof?.demonstrative_exhibit_num || rootProof?.joint_exhibit_num || '';
                const scriptSteps = rootProof && admissionScript
                  ? STEPS.map((step) => {
                      const overrideText = admissionScript.step_overrides?.[step.key]?.text;
                      const templateText = admissionTemplates.find((entry) => entry.proof_type_category_id === rootProof.proof_type_category_id && entry.step === step.key)?.default_text;
                      const text = fillExhibitNum(overrideText || templateText || '', exhibitNum);
                      return text ? { ...step, text } : null;
                    }).filter(Boolean)
                  : [];

                return (
                  <div key={rootItem.id} className="exam-v2-print-page">
                    <div className="exam-v2-print-header">
                      <div>
                        <p className="exam-v2-print-header-copy">{partyName} · {examType}</p>
                        <p className="exam-v2-print-header-title">Trial Question Outline</p>
                      </div>
                      <div className="exam-v2-print-order-badge">Exam Order {index + 1}</div>
                    </div>

                    <div className="exam-v2-print-spacer" />
                    <div className="exam-v2-print-divider" />

                    {rootProof ? (
                      <div className="exam-v2-print-proof-row">
                        <ProofThumbPreview proof={rootProof} size="md" />
                        <div>
                          <p className="text-xl font-bold text-slate-900">{getProofDisplayName(rootProof)}</p>
                          <div className="exam-v2-print-proof-meta">
                            {rootProof.joint_exhibit_num && <span className="exam-v2-print-pill joint">Joint # {rootProof.joint_exhibit_num}</span>}
                            {rootProof.admitted_exhibit_num && <span className="exam-v2-print-pill admitted">As Exhibit · Admitted # {rootProof.admitted_exhibit_num}</span>}
                            {rootProof.demonstrative_exhibit_num && <span className="exam-v2-print-pill demo">As Demo · Demo # {rootProof.demonstrative_exhibit_num}</span>}
                            {!rootProof.admitted_exhibit_num && !rootProof.demonstrative_exhibit_num && <span className="exam-v2-print-pill declined">Declined Admitted</span>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="exam-v2-print-group-box">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Question Group</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{rootItem.label}</p>
                      </div>
                    )}

                    {scriptSteps.length > 0 && (
                      <div className="exam-v2-print-script">
                        <p className="exam-v2-print-script-title">Admission Script</p>
                        {scriptSteps.map((step) => (
                          <div key={step.key} className="exam-v2-print-script-step">
                            <span className="exam-v2-print-script-label">{step.label}</span>
                            <span>{step.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      {questionTree.length > 0 ? (
                        <QuestionBranch nodes={questionTree} proofsById={proofsById} />
                      ) : (
                        <p className="exam-v2-print-empty">No questions in this exam-order item.</p>
                      )}
                    </div>

                    <div className="exam-v2-print-footer">{printedDate} · Page {index + 1}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}