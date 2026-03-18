import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, SkipForward } from 'lucide-react';

function ToneBadge({ label, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-800 text-slate-300 border border-slate-700',
    blue: 'bg-blue-500/15 text-blue-200 border border-blue-400/30',
    green: 'bg-green-500/15 text-green-200 border border-green-400/30',
    amber: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
    red: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
    purple: 'bg-purple-500/15 text-purple-200 border border-purple-400/30',
  };

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone] || tones.slate}`}>{label}</span>;
}

function Section({ title, children }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

export default function DetailsPanel({
  mode,
  selectedMeta,
  onOpenBucketMap,
  onOpenProof,
  onPublishProof,
  onBlankJury,
  onMarkQuestionAsked,
  onGoToPath,
  onSkipProof,
  onAdmitProof,
  onMarkDemonstrative,
}) {
  const [admittedExhibitNum, setAdmittedExhibitNum] = useState('');
  const [admittedBy, setAdmittedBy] = useState('Plaintiff');

  useEffect(() => {
    setAdmittedExhibitNum(selectedMeta?.proof?.admitted_exhibit_num || '');
    setAdmittedBy(selectedMeta?.proof?.admitted_by || 'Plaintiff');
  }, [selectedMeta?.proof?.id]);

  if (!selectedMeta) {
    return <aside className="w-[340px] shrink-0 border-l border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">Select a node to inspect the route.</aside>;
  }

  if (selectedMeta.type === 'bucket' && mode === 'overview') {
    return (
      <aside className="w-[340px] shrink-0 border-l border-slate-800 bg-slate-950/80 min-h-0 overflow-y-auto p-4">
        <div className="space-y-4">
          <Section title="Bucket">
            <h2 className="text-lg font-semibold text-white">{selectedMeta.bucket.name}</h2>
            <p className="text-sm text-slate-400">{selectedMeta.trialPoint?.name || 'Unassigned Trial Point'}</p>
            <div className="flex flex-wrap gap-2">
              <ToneBadge label={selectedMeta.status.label} tone={selectedMeta.status.tone} />
              <ToneBadge label={`${selectedMeta.questionCount} question sets`} tone="blue" />
              <ToneBadge label={`${selectedMeta.admissionCount} proof gates`} tone="amber" />
            </div>
          </Section>

          <Section title="What matters here">
            <div className="space-y-2 text-sm text-slate-300">
              <p>• {selectedMeta.questionCount} top-level question sets</p>
              <p>• {selectedMeta.admissionCount} proof admissions to manage</p>
              <p>• {selectedMeta.needsAdmissionCount} still need a ruling before you continue</p>
            </div>
          </Section>

          <button type="button" onClick={() => onOpenBucketMap(selectedMeta.bucket.id)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700">
            Open Bucket Map
          </button>
        </div>
      </aside>
    );
  }

  if (selectedMeta.type === 'question' || selectedMeta.type === 'branchQuestion') {
    return (
      <aside className="w-[340px] shrink-0 border-l border-slate-800 bg-slate-950/80 min-h-0 overflow-y-auto p-4">
        <div className="space-y-4">
          <Section title={selectedMeta.type === 'branchQuestion' ? 'Branch Question Set' : 'Question Set'}>
            <h2 className="text-lg font-semibold text-white">{selectedMeta.question.text}</h2>
            <div className="flex flex-wrap gap-2">
              <ToneBadge label={selectedMeta.status.label} tone={selectedMeta.status.tone} />
              {selectedMeta.branchTone && <ToneBadge label={selectedMeta.branchLabel} tone={selectedMeta.branchTone} />}
            </div>
          </Section>

          {selectedMeta.question.expected_answer && (
            <Section title="Expected Answer">
              <p className="text-sm leading-relaxed text-slate-300">{selectedMeta.question.expected_answer}</p>
            </Section>
          )}

          {selectedMeta.question.notes && (
            <Section title="Notes">
              <p className="text-sm leading-relaxed text-slate-300">{selectedMeta.question.notes}</p>
            </Section>
          )}

          <Section title="Linked Proofs">
            {selectedMeta.linkedProofs.length === 0 ? (
              <p className="text-sm text-slate-500">No linked proofs on this question set.</p>
            ) : (
              <div className="space-y-2">
                {selectedMeta.linkedProofs.map((proof) => (
                  <button key={proof.id} type="button" onClick={() => onOpenProof(proof)} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-left hover:border-slate-700">
                    <span className="text-sm text-slate-200">{proof.formal_name || proof.name}</span>
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </Section>

          {selectedMeta.followUps?.length > 0 && (
            <Section title="Follow-ups">
              <div className="space-y-2">
                {selectedMeta.followUps.map((followUp) => (
                  <div key={followUp.id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">{followUp.text}</div>
                ))}
              </div>
            </Section>
          )}

          <button type="button" onClick={() => onMarkQuestionAsked(selectedMeta.question.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700">
            <CheckCircle2 className="h-4 w-4" /> Mark Question Asked
          </button>
        </div>
      </aside>
    );
  }

  if (selectedMeta.type === 'admissionBlock') {
    const proof = selectedMeta.proof;
    const canMarkDemo = !!proof?.joint_exhibit_num;
    const canAdmit = proof?.status === 'Joint';

    return (
      <aside className="w-[340px] shrink-0 border-l border-slate-800 bg-slate-950/80 min-h-0 overflow-y-auto p-4">
        <div className="space-y-4">
          <Section title="Proof Gate">
            <h2 className="text-lg font-semibold text-white">{proof?.formal_name || proof?.name || 'Unlinked proof'}</h2>
            <div className="flex flex-wrap gap-2">
              <ToneBadge label={selectedMeta.proofStatus.label} tone={selectedMeta.proofStatus.tone} />
              <ToneBadge label={`${selectedMeta.admittedCount} admitted-route sets`} tone="green" />
              <ToneBadge label={`${selectedMeta.notAdmittedCount} not-admitted sets`} tone="red" />
            </div>
          </Section>

          <Section title="Quick Actions">
            <div className="grid gap-2">
              {proof && (
                <>
                  <button type="button" onClick={() => onOpenProof(proof)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                    <ExternalLink className="h-4 w-4" /> Open Proof
                  </button>
                  <button type="button" onClick={() => onPublishProof(proof)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <Eye className="h-4 w-4" /> Publish to Jury
                  </button>
                </>
              )}
              <button type="button" onClick={onBlankJury} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">Blank Jury Screen</button>
              <button type="button" onClick={onSkipProof} className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20">
                <SkipForward className="h-4 w-4" /> Skip Proof For Now
              </button>
            </div>
          </Section>

          <Section title="Route Control">
            <div className="grid gap-2">
              <button type="button" onClick={() => onGoToPath('admitted')} disabled={!selectedMeta.admittedPathStartId} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">Go to admitted route</button>
              <button type="button" onClick={() => onGoToPath('not_admitted')} disabled={!selectedMeta.notAdmittedPathStartId} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40">Go to not-admitted route</button>
            </div>
          </Section>

          <Section title="Admit Quickly">
            {canAdmit ? (
              <div className="space-y-3">
                <input value={admittedExhibitNum} onChange={(event) => setAdmittedExhibitNum(event.target.value)} placeholder="Admitted exhibit number" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-500" />
                <select value={admittedBy} onChange={(event) => setAdmittedBy(event.target.value)} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none">
                  <option value="Plaintiff">Plaintiff</option>
                  <option value="Defense">Defense</option>
                </select>
                <button type="button" onClick={() => onAdmitProof({ proof, admittedExhibitNum, admittedBy })} disabled={!admittedExhibitNum.trim()} className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40">Admit as Exhibit</button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">This proof must be in Joint status before it can be admitted here.</p>
            )}
            <button type="button" onClick={() => onMarkDemonstrative(proof)} disabled={!canMarkDemo} className="mt-3 w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40">Mark Demonstrative</button>
          </Section>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[340px] shrink-0 border-l border-slate-800 bg-slate-950/80 min-h-0 overflow-y-auto p-4">
      <Section title="Map Overview">
        <h2 className="text-lg font-semibold text-white">{selectedMeta.title || 'Attorney Map'}</h2>
        <p className="text-sm text-slate-400">Use the graph to move between witness overview, bucket maps, proof gates, and branch question sets.</p>
      </Section>
    </aside>
  );
}