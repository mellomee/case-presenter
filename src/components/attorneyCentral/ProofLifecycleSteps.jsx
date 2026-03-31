import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

const STEP_STYLES = {
  marked: {
    active: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    muted: 'border-stone-200 bg-stone-50 text-stone-500',
    badge: 'bg-cyan-500 text-white',
    button: 'border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50',
  },
  authenticate: {
    active: 'border-amber-200 bg-amber-50 text-amber-950',
    muted: 'border-stone-200 bg-stone-50 text-stone-500',
    badge: 'bg-amber-500 text-white',
    button: 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50',
  },
  admit: {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    muted: 'border-stone-200 bg-stone-50 text-stone-500',
    badge: 'bg-emerald-500 text-white',
    button: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
  },
  publish: {
    active: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950',
    muted: 'border-stone-200 bg-stone-50 text-stone-500',
    badge: 'bg-fuchsia-500 text-white',
    button: 'border-fuchsia-200 bg-white text-fuchsia-700 hover:bg-fuchsia-50',
  },
};

function StepActionButton({ label, onClick, disabled = false, tone = 'marked' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${STEP_STYLES[tone].button}`}
    >
      {label}
    </button>
  );
}

function StepCard({ index, tone, completed, current, children }) {
  const palette = STEP_STYLES[tone];
  const shellClass = completed || current ? palette.active : palette.muted;

  return (
    <div className={`min-w-[10.5rem] flex-1 rounded-[1.25rem] border p-3 shadow-sm transition ${shellClass} ${current ? 'ring-2 ring-black/5' : ''}`}>
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {children ? <div className="flex min-w-0 items-center gap-1.5">{children}</div> : <div />}
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${completed ? palette.badge : 'bg-white/80 text-stone-500'}`}>
          {completed ? <Check className="h-3.5 w-3.5" /> : index}
        </div>
      </div>
    </div>
  );
}

export default function ProofLifecycleSteps({
  selectedProof,
  canPublishToWitness,
  isPublishedToWitness,
  onPublishToWitness,
  onUnpublishFromWitness,
  canPublishToJury,
  isPublishedToJury,
  onPublishToJury,
  onUnpublishFromJury,
  localDecision,
  onRejectToggle,
  onAdmitExhibit,
  onAdmitDemo,
  onUnAdmit,
}) {
  if (!selectedProof) return null;

  const isDeposition = selectedProof.proof_category === 'Deposition';
  const isAuthenticated = isDeposition || ['Joint', 'Admitted', 'Demonstrative'].includes(selectedProof.status);
  const isAdmitted = isDeposition || ['Admitted', 'Demonstrative'].includes(selectedProof.status);
  const isJointExhibit = selectedProof.proof_category === 'Exhibit' && selectedProof.status === 'Joint';
  const isAdmittedProof = selectedProof.proof_category === 'Exhibit' && ['Admitted', 'Demonstrative'].includes(selectedProof.status);
  const completedSteps = isDeposition
    ? [true, isPublishedToWitness, isPublishedToJury]
    : [true, isAuthenticated, isAdmitted, isPublishedToJury];
  const currentIndex = completedSteps.findIndex((step) => !step);
  const activeIndex = currentIndex === -1 ? completedSteps.length - 1 : currentIndex;

  const steps = isDeposition
    ? [
        {
          title: 'Deposition',
          subtitle: 'Ready in Attorney Central',
          tone: 'marked',
          completed: true,
        },
        {
          title: 'Authenticate',
          subtitle: isPublishedToWitness ? 'Visible on witness screen' : 'Send to witness when ready',
          tone: 'authenticate',
          completed: isPublishedToWitness,
          action: (
            <StepActionButton
              label={isPublishedToWitness ? 'Hide Witness' : 'Show Witness'}
              onClick={isPublishedToWitness ? onUnpublishFromWitness : onPublishToWitness}
              disabled={!isPublishedToWitness && !canPublishToWitness}
              tone="authenticate"
            />
          ),
        },
        {
          title: 'Publish',
          subtitle: isPublishedToJury ? 'Live on jury screen' : 'Send to jury when ready',
          tone: 'publish',
          completed: isPublishedToJury,
          action: (
            <StepActionButton
              label={isPublishedToJury ? 'Unpublish Jury' : 'Publish Jury'}
              onClick={isPublishedToJury ? onUnpublishFromJury : onPublishToJury}
              disabled={!isPublishedToJury && !canPublishToJury}
              tone="publish"
            />
          ),
        },
      ]
    : [
        {
          tone: 'marked',
          completed: true,
        },
        {
          tone: 'authenticate',
          completed: isAuthenticated,
          action: (
            <StepActionButton
              label={isPublishedToWitness ? 'Hide Witness' : 'Show Witness'}
              onClick={isPublishedToWitness ? onUnpublishFromWitness : onPublishToWitness}
              disabled={!isPublishedToWitness && !canPublishToWitness}
              tone="authenticate"
            />
          ),
        },
        {
          tone: 'admit',
          completed: isAdmitted,
          action: isJointExhibit ? (
            <>
              <StepActionButton label="Admit Exhibit" onClick={onAdmitExhibit} tone="admit" />
              <StepActionButton label={localDecision === 'not_admitted' ? 'Undo Reject' : 'Reject'} onClick={onRejectToggle} tone="admit" />
            </>
          ) : isAdmittedProof ? (
            <StepActionButton label="Un-Admit" onClick={onUnAdmit} tone="admit" />
          ) : null,
        },
        {
          tone: 'publish',
          completed: isPublishedToJury,
          action: (
            <>
              {selectedProof.status === 'Joint' ? <StepActionButton label="Publish Demo" onClick={onAdmitDemo} tone="publish" /> : null}
              <StepActionButton
                label={isPublishedToJury ? 'Unpublish Jury' : 'Publish Jury'}
                onClick={isPublishedToJury ? onUnpublishFromJury : onPublishToJury}
                disabled={!isPublishedToJury && !canPublishToJury}
                tone="publish"
              />
            </>
          ),
        },
      ];

  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:items-stretch xl:gap-1.5">
      {steps.map((step, index) => (
        <React.Fragment key={step.title}>
          <StepCard
            index={index + 1}
            tone={step.tone}
            completed={step.completed}
            current={index === activeIndex}
          >
            {step.action}
          </StepCard>
          {index < steps.length - 1 ? (
            <>
              <div className="flex items-center justify-center text-stone-300 xl:hidden"><ArrowRight className="h-4 w-4 rotate-90" /></div>
              <div className="hidden xl:flex items-center justify-center px-0.5 text-stone-300"><ArrowRight className="h-4 w-4" /></div>
            </>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}