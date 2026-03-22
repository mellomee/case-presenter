import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import ExamBuilderSafePreviewDialog from '@/components/examV2/ExamBuilderSafePreviewDialog.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function QuestionEditorDialog({ open, onOpenChange, onSave, initialValue = null, availableProofs = [], title = 'Question' }) {
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

  const toggleProof = (proofId) => {
    setForm((prev) => ({
      ...prev,
      attached_proof_ids: prev.attached_proof_ids.includes(proofId)
        ? prev.attached_proof_ids.filter((id) => id !== proofId)
        : [...prev.attached_proof_ids, proofId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-slate-400">Build parent or follow-up questions and attach any proof clips they need.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            value={form.text}
            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
            placeholder="Question text"
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <input
            value={form.expected_answer}
            onChange={(event) => setForm((prev) => ({ ...prev, expected_answer: event.target.value }))}
            placeholder="Expected answer"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          {availableProofs.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white mb-2">Inline proof references</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableProofs.map((proof) => {
                  const active = form.attached_proof_ids.includes(proof.id);
                  const previewActive = previewProof?.id === proof.id;
                  return (
                    <div
                      key={proof.id}
                      onClick={() => toggleProof(proof.id)}
                      className={`relative rounded-xl border p-2 text-left cursor-pointer ${active ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900/60'}`}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewProof(proof);
                        }}
                        className={`absolute right-2 top-2 z-10 h-7 w-7 rounded-full border flex items-center justify-center ${previewActive ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700 bg-slate-950/90 text-slate-300 hover:text-white'}`}
                        title="Preview proof"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex justify-center">
                        <ExamBuilderProofThumb proof={proof} size="sm" />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-300 leading-tight">{getProofDisplayName(proof)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={async () => { await onSave(form); onOpenChange(false); }}>Save Question</Button>
          </div>
        </div>
        <ExamBuilderSafePreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={availableProofs} />
      </DialogContent>
    </Dialog>
  );
}