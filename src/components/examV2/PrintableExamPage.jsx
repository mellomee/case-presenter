import React, { useMemo } from 'react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import PrintableQuestionTree from '@/components/examV2/PrintableQuestionTree.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { buildAdmissionSteps } from '@/lib/admissionSteps';
import { getProofPrintMeta } from '@/lib/examV2PrintUtils';

export default function PrintableExamPage({
  rootItem,
  pageNumber,
  questionItems = [],
  proofsById = {},
  admissionTemplates = [],
  partyName = '',
  examType = '',
  isLast = false,
}) {
  const rootProof = rootItem?.item_type === 'proof' ? proofsById[rootItem.linked_proof_id] || null : null;
  const rootMeta = getProofPrintMeta(rootProof, proofsById);
  const admissionScriptItem = questionItems.find((item) => item.parent_item_id === rootItem?.id && item.item_type === 'admission_script') || null;
  const admissionSteps = useMemo(() => {
    if (!rootProof) return [];

    return buildAdmissionSteps(
      {
        proof_type_category_id: rootProof.proof_type_category_id,
        step_overrides: admissionScriptItem?.step_overrides || rootItem?.step_overrides || {},
      },
      admissionTemplates,
      rootProof.admitted_exhibit_num || rootProof.demonstrative_exhibit_num || rootProof.joint_exhibit_num || ''
    ).filter((step) => step.text);
  }, [admissionScriptItem?.step_overrides, admissionTemplates, rootItem?.step_overrides, rootProof]);

  return (
    <section
      className="bg-white px-10 pb-10 pt-0 text-slate-900"
      style={{ breakAfter: isLast ? 'auto' : 'page', pageBreakAfter: isLast ? 'auto' : 'always' }}
    >
      <div style={{ height: '5rem' }} />
      <div className="border-t-2 border-slate-300 pt-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Question {pageNumber}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{rootProof ? getProofDisplayName(rootProof) : rootItem?.label}</h1>
            <p className="mt-2 text-sm text-slate-600">{partyName} · {examType}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${rootMeta.tone}`}>{rootMeta.statusLabel}</p>
            {rootMeta.exhibitLabel && <p className="mt-1 text-sm text-slate-600">{rootMeta.exhibitLabel}</p>}
          </div>
        </div>

        {rootProof ? (
          <div className="mt-6 flex items-start gap-4 rounded-xl border border-slate-200 p-4">
            <ProofThumbPreview proof={rootProof} size="lg" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900">{getProofDisplayName(rootProof)}</p>
              <p className="text-sm text-slate-600">Internal Name: {rootProof.name}</p>
              <p className="text-sm text-slate-600">Type: {rootProof.proof_child_type || rootProof.file_type || rootProof.proof_category}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Question Group</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{rootItem?.label}</p>
          </div>
        )}

        {admissionSteps.length > 0 && (
          <div className="mt-8 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Admission Script</p>
            <div className="mt-4 space-y-3">
              {admissionSteps.map((step) => (
                <div key={step.key} className="flex items-start gap-3">
                  <span className="mt-1 h-4 w-4 flex-shrink-0 rounded-sm border border-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{step.label} · {step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-900">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <PrintableQuestionTree items={questionItems} parentId={rootItem?.id} proofsById={proofsById} />
        </div>
      </div>
    </section>
  );
}