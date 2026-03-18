import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import InlineProofPreviewDialog from '@/components/examV2/InlineProofPreviewDialog.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function GroupEditorDialog({ open, onOpenChange, onSave, initialLabel = '', initialProofIds = [], availableProofs = [] }) {
  const [label, setLabel] = useState(initialLabel);
  const [attachedProofIds, setAttachedProofIds] = useState(initialProofIds);
  const [previewProof, setPreviewProof] = useState(null);

  useEffect(() => {
    setLabel(initialLabel);
    setAttachedProofIds(initialProofIds || []);
    setPreviewProof(null);
  }, [initialLabel, initialProofIds, open]);

  const toggleProof = (proofId) => {
    setAttachedProofIds((prev) => prev.includes(proofId)
      ? prev.filter((id) => id !== proofId)
      : [...prev, proofId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Question Group</DialogTitle>
          <DialogDescription className="text-slate-400">Rename the group and attach any joint exhibit, deposition, or child proof it should carry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value.slice(0, 24))}
            placeholder="No Warn"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <div>
            <p className="text-sm font-semibold text-white mb-2">Attached proofs</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableProofs.map((proof) => {
                const active = attachedProofIds.includes(proof.id);
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
                      <ProofThumbPreview proof={proof} size="sm" />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-300 leading-tight">{getProofDisplayName(proof)}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { onSave({ label: label.trim(), attached_proof_ids: attachedProofIds }); onOpenChange(false); }}>Save Group</Button>
          </div>
        </div>
        <InlineProofPreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={availableProofs} />
      </DialogContent>
    </Dialog>
  );
}