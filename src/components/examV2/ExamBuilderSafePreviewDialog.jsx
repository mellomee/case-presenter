import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import ExamBuilderPreviewPane from '@/components/examV2/ExamBuilderPreviewPane.jsx';
import { getProofDisplayName, getProofTypeLabel } from '@/lib/examV2Utils';

export default function ExamBuilderSafePreviewDialog({ open, onOpenChange, proof, allProofs = [] }) {
  const { url } = useResolvedProofAsset(proof);
  const parentProof = useMemo(
    () => (proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) || null : null),
    [allProofs, proof?.parent_proof_id]
  );

  const videoUrl = url || proof?.video_url || parentProof?.video_url || parentProof?.file_url || proof?.file_url || '';
  const fileUrl = url || proof?.file_url || parentProof?.file_url || '';


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-slate-200 bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>{proof ? getProofDisplayName(proof) : 'Proof Preview'}</DialogTitle>
          <DialogDescription className="text-slate-500">
            {proof ? `${getProofTypeLabel(proof)} preview for Exam Builder V2.` : 'Preview the selected proof.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {proof?.status && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{proof.status}</span>}
            {proof?.joint_exhibit_num && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Joint # {proof.joint_exhibit_num}</span>}
            {proof?.admitted_exhibit_num && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Admitted # {proof.admitted_exhibit_num}</span>}
            {proof?.demonstrative_exhibit_num && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Demo # {proof.demonstrative_exhibit_num}</span>}
          </div>
          <div className="h-[60vh] min-h-0 overflow-hidden rounded-lg">
            <ExamBuilderPreviewPane proof={proof} allProofs={allProofs} />
          </div>
          {!!fileUrl && (
            <div className="flex justify-end">
              <Button asChild variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                <a href={fileUrl} target="_blank" rel="noreferrer">Open file in new tab</a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}