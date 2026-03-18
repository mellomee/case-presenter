import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildAdmissionSteps } from '@/lib/admissionSteps';

export default function AdmissionStepsDialog({ open, onOpenChange, sourceBlock, templates = [], exhibitNum = '' }) {
  const steps = buildAdmissionSteps(sourceBlock || { step_overrides: {}, proof_type_category_id: null }, templates, exhibitNum);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Admission Block Steps</DialogTitle>
          <DialogDescription className="text-slate-400">Review the proof-specific wording for steps 1 through 5.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.key} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-300">{step.label}</span>
                <span className="text-sm font-semibold text-white">{step.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{step.text || 'No custom wording set yet.'}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}