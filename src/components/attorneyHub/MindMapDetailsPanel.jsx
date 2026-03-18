import React from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, Eye, FileText, MapPinned } from 'lucide-react';
import { getProofAdmissionMeta, getProofPublishedMeta } from './mapUtils';

function ToneBadge({ label, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-slate-800 text-slate-300 border border-slate-700',
    blue: 'bg-blue-500/15 text-blue-300 border border-blue-400/30',
    green: 'bg-green-500/15 text-green-300 border border-green-400/30',
    amber: 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-400/30',
    red: 'bg-red-500/15 text-red-300 border border-red-400/30',
  };

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass[tone] || toneClass.slate}`}>{label}</span>;
}

function Section({ title, children }) {
  return (
    <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

export default function MindMapDetailsPanel({
  selectedMeta,
  publishedProofId,
  onStartBucket,
  onMarkBucketDone,
  onMarkBucketSkipped,
  onJumpNextBucket,
  onMarkQuestionAsked,
  onOpenProof,
  onPublishProof,
  onBlankJury,
}) {
  if (!selectedMeta) {
    return (
      <aside className="w-[320px] shrink-0 border-l border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
        Select a node to view details.
      </aside>
    );
  }

  const renderBucket = () => (
    <div className="space-y-4">
      <Section title="Bucket">
        <h2 className="text-lg font-semibold text-white">{selectedMeta.bucket.name}</h2>
        <p className="text-sm text-slate-400">{selectedMeta.trialPoint.name}</p>
        <div className="flex flex-wrap gap-2">
          <ToneBadge label={selectedMeta.status.label} tone={selectedMeta.status.tone} />
        </div>
      </Section>

      <Section title="Questions">
        <div className="space-y-2">
          {selectedMeta.questions.map((question, index) => (
            <div key={question.id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
              {index + 1}. {question.text}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Linked Proofs">
        <div className="space-y-2">
          {selectedMeta.linkedProofs.length === 0 && <p className="text-sm text-slate-500">No linked proofs.</p>}
          {selectedMeta.linkedProofs.map((proof) => (
            <button key={proof.id} type="button" onClick={() => onOpenProof(proof)} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-left hover:border-slate-700">
              <span className="text-sm text-slate-200">{proof.formal_name || proof.name}</span>
              <ExternalLink className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Actions">
        <div className="grid gap-2">
          <button type="button" onClick={() => onStartBucket(selectedMeta.bucket.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Start Bucket</button>
          <button type="button" onClick={() => onMarkBucketDone(selectedMeta.bucket.id)} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">Mark Done</button>
          <button type="button" onClick={() => onMarkBucketSkipped(selectedMeta.bucket.id)} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">Skip Bucket</button>
          <button type="button" onClick={() => onJumpNextBucket(selectedMeta.bucket)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">Jump to next sibling bucket <ArrowRight className="h-4 w-4" /></button>
        </div>
      </Section>
    </div>
  );

  const renderQuestion = () => (
    <div className="space-y-4">
      <Section title="Question">
        <h2 className="text-lg font-semibold text-white">{selectedMeta.question.text}</h2>
        <div className="flex flex-wrap gap-2">
          <ToneBadge label={selectedMeta.status.label} tone={selectedMeta.status.tone} />
        </div>
      </Section>

      <Section title="Follow-up Questions">
        {selectedMeta.followUps.length === 0 ? (
          <p className="text-sm text-slate-500">No follow-up questions.</p>
        ) : (
          <div className="space-y-2">
            {selectedMeta.followUps.map((followUp) => (
              <div key={followUp.id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">{followUp.text}</div>
            ))}
          </div>
        )}
      </Section>

      {selectedMeta.question.notes && (
        <Section title="Notes">
          <p className="text-sm leading-relaxed text-slate-300">{selectedMeta.question.notes}</p>
        </Section>
      )}

      <Section title="Linked Proofs">
        <div className="space-y-2">
          {selectedMeta.linkedProofs.length === 0 && <p className="text-sm text-slate-500">No linked proofs.</p>}
          {selectedMeta.linkedProofs.map((proof) => (
            <button key={proof.id} type="button" onClick={() => onOpenProof(proof)} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-left hover:border-slate-700">
              <span className="text-sm text-slate-200">{proof.formal_name || proof.name}</span>
              <ExternalLink className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      </Section>

      <button type="button" onClick={() => onMarkQuestionAsked(selectedMeta.question.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
        <CheckCircle2 className="h-4 w-4" /> Mark as Asked
      </button>
    </div>
  );

  const renderEvidenceBlock = () => (
    <div className="space-y-4">
      <Section title="Evidence Block">
        <h2 className="text-lg font-semibold text-white">{selectedMeta.proof?.formal_name || selectedMeta.proof?.name || 'Unlinked Proof'}</h2>
        <div className="flex flex-wrap gap-2">
          <ToneBadge label={selectedMeta.admissionStatus.label} tone={selectedMeta.admissionStatus.tone} />
          <ToneBadge label={selectedMeta.publishStatus.label} tone={selectedMeta.publishStatus.tone} />
        </div>
      </Section>

      <Section title="Checklist">
        <div className="space-y-2 text-sm text-slate-300">
          <p>• Mark</p>
          <p>• Identify</p>
          <p>• Authenticate</p>
          <p>• Move into evidence</p>
          <p>• Publish</p>
        </div>
      </Section>

      {selectedMeta.proof && (
        <Section title="Actions">
          <div className="grid gap-2">
            <button type="button" onClick={() => onOpenProof(selectedMeta.proof)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"><FileText className="h-4 w-4" /> Open Proof Viewer</button>
            <button type="button" onClick={() => onPublishProof(selectedMeta.proof)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Eye className="h-4 w-4" /> Publish to Jury</button>
            <button type="button" onClick={onBlankJury} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">Blank Jury Screen</button>
          </div>
        </Section>
      )}
    </div>
  );

  const renderProof = () => {
    const proof = selectedMeta.proof;
    const admission = getProofAdmissionMeta(proof);
    const publish = getProofPublishedMeta(proof?.id, publishedProofId);

    return (
      <div className="space-y-4">
        <Section title="Proof">
          <h2 className="text-lg font-semibold text-white">{proof.formal_name || proof.name}</h2>
          <p className="text-sm text-slate-400">{proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || 'No exhibit number yet'}</p>
          <div className="flex flex-wrap gap-2">
            <ToneBadge label={admission.label} tone={admission.tone} />
            <ToneBadge label={publish.label} tone={publish.tone} />
          </div>
        </Section>

        <Section title="Actions">
          <div className="grid gap-2">
            <button type="button" onClick={() => onOpenProof(proof)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"><MapPinned className="h-4 w-4" /> Open Proof Viewer</button>
            <button type="button" onClick={() => onPublishProof(proof)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Eye className="h-4 w-4" /> Publish to Jury</button>
            <button type="button" onClick={onBlankJury} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">Blank Jury Screen</button>
          </div>
        </Section>
      </div>
    );
  };

  const renderDefault = () => (
    <Section title="Overview">
      <h2 className="text-lg font-semibold text-white">{selectedMeta.witness?.first_name || selectedMeta.trialPoint?.name || 'Attorney Hub'}</h2>
      <p className="text-sm text-slate-400">Pick a bucket to drill into questions and proofs.</p>
    </Section>
  );

  return (
    <aside className="w-[320px] shrink-0 border-l border-slate-800 bg-slate-950/80 min-h-0 overflow-y-auto p-4">
      {selectedMeta.type === 'bucket' && renderBucket()}
      {selectedMeta.type === 'question' && renderQuestion()}
      {selectedMeta.type === 'evidenceBlock' && renderEvidenceBlock()}
      {selectedMeta.type === 'proof' && renderProof()}
      {!['bucket', 'question', 'evidenceBlock', 'proof'].includes(selectedMeta.type) && renderDefault()}
    </aside>
  );
}