import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import AdmissionEndActions from './AdmissionEndActions.jsx';

const DECISION_META = {
  admit: {
    label: 'Admitted as Exhibit',
    className: 'bg-green-950/40 border border-green-900/50 text-green-300',
    cta: 'Start Path 1 Questions',
  },
  demo: {
    label: 'Admitted as Demonstrative',
    className: 'bg-purple-950/40 border border-purple-900/50 text-purple-300',
    cta: 'Start Path 1 Questions',
  },
  not_admitted: {
    label: 'Not Admitted',
    className: 'bg-red-950/40 border border-red-900/50 text-red-300',
    cta: 'Start Path 2 Questions',
  },
};

export default function AdmissionBlockTrialPanel({
  item,
  index,
  total,
  visibleSteps = [],
  currentStepIndex = 0,
  decision = null,
  canGoPrev = false,
  canGoNext = false,
  onPrevStep,
  onNextStep,
  onSelectProof,
  onRuling,
  onDecision,
  isRulingLoading,
  onStartPath,
}) {
  if (!item) return null;

  const { bucket, blockProof, blockSteps = [], pathQuestionSets = { admitted: [], not_admitted: [] } } = item;
  const currentStep = visibleSteps[currentStepIndex] || blockSteps[currentStepIndex] || null;
  const decisionMeta = decision ? DECISION_META[decision] : null;
  const admittedCount = pathQuestionSets.admitted?.length || 0;
  const notAdmittedCount = pathQuestionSets.not_admitted?.length || 0;
  const canStartAdmittedPath = currentStep?.key === '5' && (decision === 'admit' || decision === 'demo');

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-xl border-l-4 border-amber-500 shadow-xl">
        <div className="flex items-center gap-2 px-5 pt-4 pb-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{bucket?.name}</span>
          <Badge className="bg-amber-900/50 text-amber-400 text-xs border border-amber-700/50">Admission Block</Badge>
          <span className="ml-auto text-xs text-slate-600">{index + 1} / {total}</span>
        </div>

        <div className="px-5 pt-3 pb-4 space-y-3">
          <div>
            <p className="text-2xl font-bold text-white leading-snug">
              {blockProof?.formal_name || blockProof?.name || 'Admission Block'}
            </p>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Work through the admission sequence, rule on the proof, then continue into the matching post-ruling path.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-green-950/40 border border-green-900/50 px-2.5 py-1 text-green-300">
              Path 1: {admittedCount} question{admittedCount !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full bg-red-950/40 border border-red-900/50 px-2.5 py-1 text-red-300">
              Path 2: {notAdmittedCount} question{notAdmittedCount !== 1 ? 's' : ''}
            </span>
            {blockProof && (
              <button
                onClick={() => onSelectProof?.(blockProof)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700 px-2.5 py-1 text-slate-200 hover:bg-slate-600 transition-colors"
              >
                <FileText className="w-3 h-3 text-amber-400" />
                {blockProof.admitted_exhibit_num || blockProof.demonstrative_exhibit_num || blockProof.joint_exhibit_num || blockProof.formal_name || blockProof.name}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-slate-700/60">
          <div className="flex flex-wrap gap-2">
            {visibleSteps.map((step, stepIndex) => {
              const isActive = stepIndex === currentStepIndex;
              const isComplete = stepIndex < currentStepIndex;

              return (
                <div
                  key={step.key}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : isComplete
                        ? 'border-slate-600 bg-slate-700 text-slate-200'
                        : 'border-slate-700 bg-slate-900/60 text-slate-500'
                  }`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {currentStep && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Admission Step</p>
                <div className="mt-2 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-600 text-white text-xs">{currentStep.label}</Badge>
                    <p className="text-sm font-semibold text-slate-200">{currentStep.title}</p>
                  </div>
                  <p className="text-base text-white leading-relaxed">
                    {currentStep.text || 'No question text is set for this step yet.'}
                  </p>
                </div>
              </div>

              {decisionMeta && (
                <div className={`rounded-lg px-4 py-3 text-sm font-medium ${decisionMeta.className}`}>
                  {decisionMeta.label}
                </div>
              )}

              {currentStep.key === '4' && (
                <AdmissionEndActions
                  proof={blockProof}
                  onRuling={onRuling}
                  onDecision={onDecision}
                  isLoading={isRulingLoading}
                />
              )}

              {canStartAdmittedPath && decisionMeta && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Step 5 is ready.</p>
                    <p className="text-xs text-slate-400 mt-1">Move into the admitted path questions when you’re ready.</p>
                  </div>
                  <Button onClick={onStartPath} className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0">
                    {decisionMeta.cta} <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onPrevStep}
              disabled={!canGoPrev}
              className="gap-2 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Step
            </Button>
            <Button
              onClick={onNextStep}
              disabled={!canGoNext}
              className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}