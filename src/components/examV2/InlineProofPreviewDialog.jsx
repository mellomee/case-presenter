import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InlineProofPreviewPane from '@/components/examV2/InlineProofPreviewPane.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';

export default function InlineProofPreviewDialog({ open, onOpenChange, proof, allProofs = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-slate-950 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getProofDisplayName(proof)}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {proof?.proof_child_type || proof?.file_type || 'Proof'} preview
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            {proof?.joint_exhibit_num && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">Joint #{proof.joint_exhibit_num}</span>}
            {proof?.proof_child_type && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">{proof.proof_child_type}</span>}
            {proof?.clipped_page && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">Page {proof.clipped_page}</span>}
            {Array.isArray(proof?.video_clips) && proof.video_clips.length > 0 && <span className="rounded-full bg-slate-900 border border-slate-700 px-2 py-1">{proof.video_clips.length} segment{proof.video_clips.length === 1 ? '' : 's'}</span>}
          </div>
          <div className="h-[75vh]">
            <InlineProofPreviewPane proof={proof} allProofs={allProofs} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}