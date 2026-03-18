import React from 'react';
import { buildAdmissionSteps } from '@/lib/admissionSteps';
import { getProofDisplayLabel, isProofPublishable } from './mindMapUtils';
import ProofPreviewCard from './ProofPreviewCard.jsx';

function InfoBadge({ label, tone = 'slate' }) {
  const className = tone === 'green'
    ? 'bg-emerald-100 text-emerald-700'
    : tone === 'blue'
      ? 'bg-blue-100 text-blue-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : tone === 'red'
          ? 'bg-rose-100 text-rose-700'
          : tone === 'purple'
            ? 'bg-purple-100 text-purple-700'
            : tone === 'pink'
              ? 'bg-pink-100 text-pink-700'
              : 'bg-slate-100 text-slate-600';

  return <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${className}`}>{label}</span>;
}

function ActionButton({ label, onClick, variant = 'outline', disabled = false }) {
  const className = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300'
    : variant === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${className}`}
    >
      {label}
    </button>
  );
}

function QuestionChecklist({ questions = [], askedQuestionIds = {}, onToggleAsked, depth = 0, parentId = null }) {
  const items = questions
    .filter((question) => (question.parent_question_id || null) === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (items.length === 0) return null;

  return (
    <div className={`space-y-2 ${depth > 0 ? 'ml-5 border-l border-slate-200 pl-4' : ''}`}>
      {items.map((question) => (
        <div key={question.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!askedQuestionIds[question.id]}
              onChange={() => onToggleAsked(question.id)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${askedQuestionIds[question.id] ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{question.text}</p>
              {question.expected_answer ? <p className="mt-1 text-xs text-emerald-700">Expected: {question.expected_answer}</p> : null}
              {question.notes ? <p className="mt-1 text-xs text-amber-700">Notes: {question.notes}</p> : null}
            </div>
          </label>
          <QuestionChecklist
            questions={questions}
            askedQuestionIds={askedQuestionIds}
            onToggleAsked={onToggleAsked}
            depth={depth + 1}
            parentId={question.id}
          />
        </div>
      ))}
    </div>
  );
}

export default function AttorneyHubDetailsPanel({
  selectedItem,
  askedQuestionIds = {},
  onToggleAsked,
  onSelectNode,
  onBucketStatusChange,
  nextSiblingBucket,
  admissionTemplates = [],
  juryState,
  liveSync,
  onToggleLiveSync,
  onPublishProof,
  onBlankJury,
  onPreviewStateChange,
  onSetBlockOutcome,
}) {
  if (!selectedItem) {
    return (
      <div className="h-full w-[360px] flex-shrink-0 border-l border-slate-200 bg-white p-5">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Select a bucket, question group, or admission block to work from the map.
        </div>
      </div>
    );
  }

  const previewProof = selectedItem.type === 'questionGroup'
    ? selectedItem.proof
    : selectedItem.type === 'evidenceBlock'
      ? selectedItem.proof
      : null;

  const published = previewProof && juryState?.published_proof_id === previewProof.id && !juryState?.is_blank;
  const publishable = previewProof ? isProofPublishable(previewProof) : false;
  const admissionSteps = selectedItem.type === 'evidenceBlock' && selectedItem.proof
    ? buildAdmissionSteps(
        selectedItem.block,
        admissionTemplates,
        selectedItem.proof.admitted_exhibit_num || selectedItem.proof.demonstrative_exhibit_num || selectedItem.proof.joint_exhibit_num || ''
      )
    : [];

  return (
    <div className="h-full w-[360px] flex-shrink-0 border-l border-slate-200 bg-slate-50/70 overflow-y-auto">
      <div className="space-y-4 p-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Selected Node</p>

          {selectedItem.type === 'bucket' && (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xl font-bold text-slate-900">{selectedItem.bucket.name}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.trialPoint.name}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoBadge label={selectedItem.status} tone={selectedItem.status === 'Done' ? 'green' : selectedItem.status === 'Active' ? 'blue' : selectedItem.status === 'Skipped' ? 'red' : 'slate'} />
                <InfoBadge label={`${selectedItem.questionGroups.length} groups`} tone="purple" />
                {selectedItem.admissionBlocks.length > 0 ? <InfoBadge label={`${selectedItem.admissionBlocks.length} admission block${selectedItem.admissionBlocks.length === 1 ? '' : 's'}`} tone="amber" /> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton label="Start Bucket" variant="primary" onClick={() => onBucketStatusChange(selectedItem.bucket.id, 'Active')} />
                <ActionButton label="Mark Done" onClick={() => onBucketStatusChange(selectedItem.bucket.id, 'Done')} />
                <ActionButton label="Skipped" onClick={() => onBucketStatusChange(selectedItem.bucket.id, 'Skipped')} />
                {nextSiblingBucket ? <ActionButton label={`Jump to ${nextSiblingBucket.name}`} onClick={() => onSelectNode(`bucket-${nextSiblingBucket.id}`)} /> : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question Groups</p>
                <div className="mt-2 space-y-2">
                  {selectedItem.questionGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => onSelectNode(`group::${group.id}`)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100"
                    >
                      <p className="text-sm font-semibold text-slate-900">{group.node_label || group.name}</p>
                      {group.why_it_matters ? <p className="mt-1 text-xs text-slate-500">{group.why_it_matters}</p> : null}
                    </button>
                  ))}
                  {selectedItem.questionGroups.length === 0 && <p className="text-sm text-slate-500">No question groups in this bucket yet.</p>}
                </div>
              </div>
            </div>
          )}

          {selectedItem.type === 'questionGroup' && (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-lg font-bold text-slate-900">{selectedItem.questionGroup.name}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.bucket.name}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoBadge label={`${selectedItem.questions.length} questions`} tone="blue" />
                {selectedItem.proof ? <InfoBadge label="Proof Focus" tone="teal" /> : null}
                {selectedItem.admissionBlocks.length > 0 ? <InfoBadge label={`${selectedItem.admissionBlocks.length} admission`} tone="amber" /> : null}
              </div>

              {selectedItem.questionGroup.why_it_matters && (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {selectedItem.questionGroup.why_it_matters}
                </div>
              )}

              {selectedItem.proof && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof Focus</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{getProofDisplayLabel(selectedItem.proof)}</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedItem.proof.formal_name || selectedItem.proof.name}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question Checklist</p>
                <div className="mt-2 space-y-2">
                  <QuestionChecklist
                    questions={selectedItem.questions}
                    askedQuestionIds={askedQuestionIds}
                    onToggleAsked={onToggleAsked}
                  />
                  {selectedItem.questions.length === 0 && <p className="text-sm text-slate-500">No questions in this group yet.</p>}
                </div>
              </div>

              {selectedItem.admissionBlocks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admission Blocks</p>
                  <div className="mt-2 space-y-2">
                    {selectedItem.admissionBlocks.map((block) => (
                      <button
                        key={block.id}
                        onClick={() => onSelectNode(`block::${block.id}`)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100"
                      >
                        <p className="text-sm font-semibold text-slate-900">Open Admission Block</p>
                        <p className="mt-1 text-xs text-slate-500">{block.proof_id}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedItem.type === 'evidenceBlock' && (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-lg font-bold text-slate-900">{selectedItem.proof ? `Admission · ${getProofDisplayLabel(selectedItem.proof)}` : 'Admission Block'}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.questionGroup?.name || selectedItem.bucket.name}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoBadge label={selectedItem.outcome === 'admitted' ? 'Admitted' : selectedItem.outcome === 'demonstrative' ? 'Demonstrative' : selectedItem.outcome === 'not_admitted' ? 'Not Admitted' : 'Needs Admission'} tone={selectedItem.outcome === 'admitted' ? 'green' : selectedItem.outcome === 'demonstrative' ? 'purple' : selectedItem.outcome === 'not_admitted' ? 'red' : 'amber'} />
                <InfoBadge label={selectedItem.published ? 'Published' : 'Private'} tone={selectedItem.published ? 'pink' : 'slate'} />
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton label="Admit Exhibit" variant="primary" onClick={() => onSetBlockOutcome(selectedItem.block, 'admitted')} />
                <ActionButton label="Demonstrative" onClick={() => onSetBlockOutcome(selectedItem.block, 'demonstrative')} />
                <ActionButton label="Not Admitted" variant="danger" onClick={() => onSetBlockOutcome(selectedItem.block, 'not_admitted')} />
                <ActionButton label="Reset" onClick={() => onSetBlockOutcome(selectedItem.block, 'needs_admission')} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Remembered Steps</p>
                <div className="mt-2 space-y-2">
                  {admissionSteps.map((step) => (
                    <div key={step.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-500">{step.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                      {step.text ? <p className="mt-1 text-xs text-slate-600">{step.text}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {previewProof && (
          <ProofPreviewCard
            proof={previewProof}
            onStateChange={onPreviewStateChange}
            publishable={publishable}
            published={!!published}
            liveSync={liveSync}
            onToggleLiveSync={onToggleLiveSync}
            onPublish={() => onPublishProof(previewProof)}
            onBlankJury={onBlankJury}
          />
        )}
      </div>
    </div>
  );
}