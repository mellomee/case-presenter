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

function renderQuestionProofHint(question) {
  const proofIds = Array.isArray(question?.linkedProofs) ? question.linkedProofs.length : 0;
  if (!proofIds) return null;
  return <InfoBadge label={`${proofIds} linked proof${proofIds === 1 ? '' : 's'}`} tone="blue" />;
}

export default function AttorneyHubDetailsPanel({
  selectedItem,
  proofOptions = [],
  linkDraft,
  setLinkDraft,
  onCreateProofLink,
  onDeleteProofLink,
  onSelectNode,
  onBucketStatusChange,
  nextSiblingBucket,
  onMarkQuestionAsked,
  admissionTemplates = [],
  juryState,
  liveSync,
  onToggleLiveSync,
  onPublishProof,
  onBlankJury,
  onPreviewStateChange,
}) {
  if (!selectedItem) {
    return (
      <div className="h-full w-[340px] flex-shrink-0 border-l border-slate-200 bg-white p-5">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Select a node to see proof context, question clusters, admission reminders, and publish controls.
        </div>
      </div>
    );
  }

  const previewProof = selectedItem.type === 'proof'
    ? selectedItem.proof
    : selectedItem.type === 'evidenceBlock'
      ? selectedItem.proof
      : selectedItem.type === 'bucket'
        ? selectedItem.linkedProofs[0] || null
        : selectedItem.type === 'question'
          ? selectedItem.linkedProofs[0] || null
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
    <div className="h-full w-[340px] flex-shrink-0 border-l border-slate-200 bg-slate-50/70 overflow-y-auto">
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
                {selectedItem.needsAdmission ? <InfoBadge label="Needs Admission" tone="amber" /> : null}
                {selectedItem.linkedProofs.length > 0 ? <InfoBadge label={`${selectedItem.linkedProofs.length} proofs`} tone="purple" /> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton label="Start Bucket" variant="primary" onClick={() => onBucketStatusChange(selectedItem.bucket.id, 'Active')} />
                <ActionButton label="Mark Done" onClick={() => onBucketStatusChange(selectedItem.bucket.id, 'Done')} />
                <ActionButton label="Skipped" onClick={() => onBucketStatusChange(selectedItem.bucket.id, 'Skipped')} />
                {nextSiblingBucket ? <ActionButton label={`Jump to ${nextSiblingBucket.name}`} onClick={() => onSelectNode(`bucket-${nextSiblingBucket.id}`)} /> : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question Cluster</p>
                <div className="mt-2 space-y-2">
                  {selectedItem.questions.map((question) => (
                    <button
                      key={question.id}
                      onClick={() => onSelectNode(`question-${selectedItem.bucket.id}-${question.id}`)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
                    >
                      <p className="text-sm font-medium text-slate-800">{question.text}</p>
                    </button>
                  ))}
                  {selectedItem.questions.length === 0 && <p className="text-sm text-slate-500">No questions in this bucket yet.</p>}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Link a Proof to this Bucket</p>
                <div className="mt-2 space-y-2">
                  <select
                    value={linkDraft.proofId}
                    onChange={(e) => setLinkDraft((prev) => ({ ...prev, proofId: e.target.value }))}
                    className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="">Choose a proof…</option>
                    {proofOptions.map((proof) => (
                      <option key={proof.id} value={proof.id}>{proof.formal_name || proof.name}</option>
                    ))}
                  </select>
                  <input
                    value={linkDraft.nodeLabel}
                    onChange={(e) => setLinkDraft((prev) => ({ ...prev, nodeLabel: e.target.value }))}
                    placeholder="Short node label"
                    className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  />
                  <textarea
                    value={linkDraft.whyItMatters}
                    onChange={(e) => setLinkDraft((prev) => ({ ...prev, whyItMatters: e.target.value }))}
                    placeholder="Why this proof helps prove this bucket"
                    rows={3}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                  <ActionButton label="Add Proof Link" variant="primary" onClick={onCreateProofLink} disabled={!linkDraft.proofId} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Linked Proofs</p>
                <div className="mt-2 space-y-2">
                  {selectedItem.linkedProofs.map((proof) => {
                    const entry = selectedItem.linkedProofEntries.find((item) => item.proof_id === proof.id);
                    return (
                      <div key={proof.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <button onClick={() => onSelectNode(`proof-${selectedItem.bucket.id}-${proof.id}`)} className="min-w-0 text-left">
                            <p className="truncate text-sm font-semibold text-slate-900">{entry?.node_label || getProofDisplayLabel(proof)}</p>
                            <p className="mt-1 text-xs text-slate-500">{entry?.why_it_matters || proof.formal_name || proof.name}</p>
                          </button>
                          {entry ? <ActionButton label="Remove" onClick={() => onDeleteProofLink(entry.id)} /> : null}
                        </div>
                      </div>
                    );
                  })}
                  {selectedItem.linkedProofs.length === 0 && <p className="text-sm text-slate-500">No linked proofs yet.</p>}
                </div>
              </div>
            </div>
          )}

          {selectedItem.type === 'question' && (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-lg font-bold text-slate-900">{selectedItem.question.text}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.bucket.name}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {renderQuestionProofHint(selectedItem)}
                {selectedItem.question.expected_answer ? <InfoBadge label="Expected Answer" tone="green" /> : null}
                {selectedItem.question.notes ? <InfoBadge label="Notes" tone="amber" /> : null}
              </div>

              {selectedItem.question.expected_answer && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {selectedItem.question.expected_answer}
                </div>
              )}

              {selectedItem.question.notes && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {selectedItem.question.notes}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <ActionButton label="Mark as Asked" variant="primary" onClick={() => onMarkQuestionAsked(selectedItem.question.id)} />
                <ActionButton label="Open Bucket" onClick={() => onSelectNode(`bucket-${selectedItem.bucket.id}`)} />
              </div>

              {selectedItem.linkedProofs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Linked Proofs</p>
                  <div className="mt-2 space-y-2">
                    {selectedItem.linkedProofs.map((proof) => (
                      <button
                        key={proof.id}
                        onClick={() => onSelectNode(`proof-${selectedItem.bucket.id}-${proof.id}`)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
                      >
                        <p className="text-sm font-semibold text-slate-900">{getProofDisplayLabel(proof)}</p>
                        <p className="text-xs text-slate-500">{proof.formal_name || proof.name}</p>
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
                <p className="mt-1 text-sm text-slate-500">{selectedItem.bucket.name}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoBadge label={selectedItem.proof?.status || 'Not Marked'} tone={selectedItem.proof?.status === 'Admitted' ? 'green' : selectedItem.proof?.status === 'Demonstrative' ? 'purple' : selectedItem.proof?.status === 'Joint' ? 'blue' : 'slate'} />
                <InfoBadge label={selectedItem.proof && juryState?.published_proof_id === selectedItem.proof.id && !juryState?.is_blank ? 'Published' : 'Not Published'} tone={selectedItem.proof && juryState?.published_proof_id === selectedItem.proof.id && !juryState?.is_blank ? 'pink' : 'slate'} />
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

          {selectedItem.type === 'proof' && (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-lg font-bold text-slate-900">{getProofDisplayLabel(selectedItem.proof)}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.link?.why_it_matters || selectedItem.proof.formal_name || selectedItem.proof.name}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoBadge label={selectedItem.proof.status || 'Draft'} tone={selectedItem.proof.status === 'Admitted' ? 'green' : selectedItem.proof.status === 'Demonstrative' ? 'purple' : selectedItem.proof.status === 'Joint' ? 'blue' : 'slate'} />
                <InfoBadge label={selectedItem.published ? 'Published' : 'Not Published'} tone={selectedItem.published ? 'pink' : 'slate'} />
                <InfoBadge label={selectedItem.proof.file_type} tone="blue" />
              </div>

              {selectedItem.link?.quote_or_line ? (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{selectedItem.link.quote_or_line}</div>
              ) : null}
            </div>
          )}
        </div>

        {(previewProof || selectedItem.type === 'proof' || selectedItem.type === 'bucket' || selectedItem.type === 'evidenceBlock' || selectedItem.type === 'question') && (
          <ProofPreviewCard
            proof={previewProof}
            onStateChange={onPreviewStateChange}
            publishable={publishable}
            published={!!published}
            liveSync={liveSync}
            onToggleLiveSync={onToggleLiveSync}
            onPublish={() => previewProof && onPublishProof(previewProof)}
            onBlankJury={onBlankJury}
          />
        )}
      </div>
    </div>
  );
}