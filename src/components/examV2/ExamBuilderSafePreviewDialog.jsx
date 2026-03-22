import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { getProofDisplayName, getProofTypeLabel } from '@/lib/examV2Utils';

export default function ExamBuilderSafePreviewDialog({ open, onOpenChange, proof, allProofs = [] }) {
  const { url } = useResolvedProofAsset(proof);
  const parentProof = useMemo(
    () => (proof?.parent_proof_id ? allProofs.find((item) => item.id === proof.parent_proof_id) || null : null),
    [allProofs, proof?.parent_proof_id]
  );

  const videoUrl = url || proof?.video_url || parentProof?.video_url || parentProof?.file_url || proof?.file_url || '';
  const fileUrl = url || proof?.file_url || parentProof?.file_url || '';

  const renderContent = () => {
    if (!proof) {
      return <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">No proof selected.</div>;
    }

    if (proof.proof_child_type === 'VideoClip' || proof.file_type === 'Video') {
      if (!videoUrl) {
        return <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">Video unavailable.</div>;
      }
      return <video key={videoUrl} src={videoUrl} controls className="h-[60vh] w-full rounded-lg bg-black" />;
    }

    if (proof.file_type === 'Image' && fileUrl) {
      return <div className="flex h-[60vh] items-center justify-center rounded-lg bg-slate-950 p-4"><img src={fileUrl} alt={getProofDisplayName(proof)} className="max-h-full max-w-full rounded object-contain" /></div>;
    }

    if (fileUrl) {
      return <iframe title={getProofDisplayName(proof)} src={fileUrl} className="h-[60vh] w-full rounded-lg border border-slate-200 bg-white" />;
    }

    return <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">Preview unavailable.</div>;
  };

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
          {renderContent()}
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