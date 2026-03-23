import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ExamBuilderSafePreviewDialog from '@/components/examV2/ExamBuilderSafePreviewDialog.jsx';
import V2ProofReferenceBrowser from '@/components/examV2/V2ProofReferenceBrowser.jsx';

export default function QuestionEditorDialogEnhanced({ open, onOpenChange, onSave, initialValue = null, availableProofs = [], title = 'Question' }) {
  const [form, setForm] = useState({ text: '', expected_answer: '', notes: '', attached_proof_ids: [] });
  const [previewProof, setPreviewProof] = useState(null);

  useEffect(() => {
    setForm({
      text: initialValue?.text || '',
      expected_answer: initialValue?.expected_answer || '',
      notes: initialValue?.notes || '',
      attached_proof_ids: initialValue?.attached_proof_ids || [],
    });
    setPreviewProof(null);
  }, [initialValue, open]);

  const availableProofsWithParty = useMemo(
    () => availableProofs.map((proof) => ({ ...proof, party: proof.party || null })),
    [availableProofs]
  );

  const toggleProof = (proofId) => {
    setForm((prev) => ({
      ...prev,
      attached_proof_ids: prev.attached_proof_ids.includes(proofId)
        ? prev.attached_proof_ids.filter((id) => id !== proofId)
        : [...prev.attached_proof_ids, proofId],
    }));
  };

  const removeAttachedProof = (proofId) => {
    setForm((prev) => ({
      ...prev,
      attached_proof_ids: prev.attached_proof_ids.filter((id) => id !== proofId),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-slate-200 bg-white text-slate-900 max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-slate-500">Build parent or follow-up questions and attach the proof references you need.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            value={form.text}
            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
            placeholder="Question text"
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
          <input
            value={form.expected_answer}
            onChange={(event) => setForm((prev) => ({ ...prev, expected_answer: event.target.value }))}
            placeholder="Expected answer"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />

          {availableProofsWithParty.length > 0 && (
            <V2ProofReferenceBrowser
              availableProofs={availableProofsWithParty}
              attachedProofIds={form.attached_proof_ids}
              onToggleProof={toggleProof}
              onRemoveProof={removeAttachedProof}
              onPreviewProof={setPreviewProof}
              previewProofId={previewProof?.id || null}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={async () => { await onSave(form); onOpenChange(false); }}>Save Question</Button>
          </div>
        </div>
        <ExamBuilderSafePreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={availableProofs} />
      </DialogContent>
    </Dialog>
  );
}