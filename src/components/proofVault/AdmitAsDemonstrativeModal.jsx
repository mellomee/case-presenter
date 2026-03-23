import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';

export default function AdmitAsDemonstrativeModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const parentProof = useMemo(
    () => (proof?.parent_proof_id ? proofs.find((item) => item.id === proof.parent_proof_id) || null : null),
    [proof?.parent_proof_id, proofs]
  );
  const isTopLevelProof = !proof?.parent_proof_id;
  const jointNumber = proof?.joint_exhibit_num || parentProof?.joint_exhibit_num || '';

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!proof?.id) return;

      await base44.entities.Proof.update(proof.id, {
        status: 'Demonstrative',
        demonstrative_exhibit_num: jointNumber,
      });

      if (!isTopLevelProof) return;

      const descendantProofs = proofs.filter((item) => {
        let currentParentId = item.parent_proof_id;
        while (currentParentId) {
          if (currentParentId === proof.id) return true;
          currentParentId = proofs.find((candidate) => candidate.id === currentParentId)?.parent_proof_id || null;
        }
        return false;
      });

      for (const child of descendantProofs) {
        await base44.entities.Proof.update(child.id, {
          status: 'Demonstrative',
          demonstrative_exhibit_num: jointNumber,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      onClose();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Admit as Demonstrative</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3 flex gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-900">Proof: {proof?.name}</p>
              <p className="text-xs text-purple-700 mt-1">Current: Joint (Ex. {jointNumber || '—'})</p>
              {parentProof && <p className="text-xs text-purple-700 mt-1">Parent Proof: {parentProof.formal_name || parentProof.name}</p>}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Demonstrative Exhibit #</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{jointNumber || '—'}</p>
              <p className="text-xs text-slate-500 mt-1">
                Inherited from Joint Exhibit # (no additional number required)
              </p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
            <p className="text-xs text-purple-800">
              <strong>Note:</strong> {isTopLevelProof
                ? 'This proof and its child proofs will be marked Demonstrative.'
                : 'Only this child proof will be marked Demonstrative. The parent proof stays Joint unless it is admitted separately.'}
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateMutation.isPending ? 'Admitting...' : 'Admit as Demonstrative'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}