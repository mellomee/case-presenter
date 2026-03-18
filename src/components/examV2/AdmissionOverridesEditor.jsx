import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildAdmissionSteps } from '@/lib/admissionSteps';

export default function AdmissionOverridesEditor({ open, onOpenChange, sourceBlock, templates = [], exhibitNum = '', onSave }) {
  const [values, setValues] = useState({});
  const steps = buildAdmissionSteps(sourceBlock || { step_overrides: {}, proof_type_category_id: null }, templates, exhibitNum);

  useEffect(() => {
    const nextValues = {};
    steps.forEach((step) => {
      nextValues[step.key] = sourceBlock?.step_overrides?.[step.key]?.text || step.text || '';
    });
    setValues(nextValues);
  }, [open, sourceBlock, exhibitNum]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Admission Block Wording</DialogTitle>
          <DialogDescription className="text-slate-400">These overrides stay on the proof item in Exam Builder V2.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.key} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-white mb-2">{step.label} · {step.title}</p>
              <textarea
                rows={3}
                value={values[step.key] || ''}
                onChange={(event) => setValues((prev) => ({ ...prev, [step.key]: event.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { onSave(Object.fromEntries(Object.entries(values).map(([key, text]) => [key, { text }]))); onOpenChange(false); }}>Save Overrides</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}