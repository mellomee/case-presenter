import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, ArrowUp } from 'lucide-react';
import { collectDescendantProofs, getNearestJointExhibitNumber } from '@/lib/proofStatusUtils';

export default function UnAdmitModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const proofsById = useMemo(() => Object.fromEntries(proofs.map((item) => [item.id, item])), [proofs]);
  const descendantProofs = useMemo(() => (proof?.id ? collectDescendantProofs(proofs, proof.id) : []), [proof?.id, proofs]);
  const jointExhibitNum = getNearestJointExhibitNumber(proof, proofsById);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const resetStatus = {
        status: 'Joint',
        admitted_exhibit_num: null,
        admitted_by: null,
        admit_date: null,
        demonstrative_exhibit_num: null,
      };

      await base44.entities.Proof.update(proof.id, resetStatus);

      for (const child of descendantProofs) {
        await base44.entities.Proof.update(child.id, resetStatus);
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

  const handleSubmit = () => {
    updateMutation.mutate();
  };

  const isAdmitted = proof?.status === 'Admitted';
  const statusLabel = isAdmitted ? 'Admitted' : 'Demonstrative';
  const exhibitNum = isAdmitted ? proof?.admitted_exhibit_num : proof?.demonstrative_exhibit_num;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Un-Admit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">Proof: {proof?.name}</p>
              <p className="text-xs text-orange-700 mt-1">
                Current: {statusLabel}{exhibitNum ? ` (Ex. ${exhibitNum})` : ''}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-medium text-slate-700">Status Flow:</div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isAdmitted
                  ? 'bg-green-100 text-green-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {statusLabel}
              </span>
              <ArrowUp className="w-4 h-4 text-slate-400 rotate-90" />
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                Joint
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <p className="text-xs text-slate-700">
              <strong>Details:</strong>
            </p>
            <ul className="text-xs text-slate-600 mt-2 space-y-1 ml-3">
              <li>• Proof will return to Joint status</li>
              <li>• Any admitted or demonstrative label on this proof will be cleared</li>
              {jointExhibitNum && <li>• Joint exhibit # {jointExhibitNum} remains intact</li>}
              {descendantProofs.length > 0 && <li>• Child proofs under this proof will also be demoted</li>}
            </ul>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {updateMutation.isPending ? 'Demoting...' : 'Demote to Joint'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}