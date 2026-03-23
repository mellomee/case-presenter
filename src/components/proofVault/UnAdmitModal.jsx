import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, ArrowUp } from 'lucide-react';

export default function UnAdmitModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const isAdmitted = proof.status === 'Admitted';
      const updateData = { status: 'Joint' };
      if (isAdmitted) {
        updateData.admitted_exhibit_num = null;
        updateData.admitted_by = null;
        updateData.admit_date = null;
      } else {
        updateData.demonstrative_exhibit_num = null;
      }
      await base44.entities.Proof.update(proof.id, updateData);

      const children = proofs.filter((p) => p.parent_proof_id === proof.id);
      for (const child of children) {
        await base44.entities.Proof.update(child.id, updateData);
      }

      return { updateData, childIds: children.map((child) => child.id) };
    },
    onSuccess: ({ updateData, childIds }) => {
      queryClient.setQueryData(['proofs'], (current = []) => current.map((item) => (
        item.id === proof.id || childIds.includes(item.id)
          ? { ...item, ...updateData }
          : item
      )));
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
                Current: {statusLabel} (Ex. {exhibitNum})
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
              {isAdmitted && (
                <>
                  <li>• Admitted exhibit # will be cleared</li>
                  <li>• Can no longer be published to jury</li>
                </>
              )}
              {!isAdmitted && (
                <li>• Demonstrative status will be cleared</li>
              )}
              <li>• Joint exhibit # remains intact</li>
              <li>• All child proofs will also be demoted</li>
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