import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, ArrowUp, AlertTriangle } from 'lucide-react';

export default function RemoveFromJointModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();
  const [unattachAll, setUnattachAll] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list(),
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  // Find all questions attached to this proof or its children
  const attachedQuestions = questions.filter((q) => {
    const proofIds = Array.isArray(q.proof_ids) ? q.proof_ids : [];
    const childProofIds = proofs
      .filter((p) => p.parent_proof_id === proof.id)
      .map((p) => p.id);
    
    return proofIds.includes(proof.id) || childProofIds.some((cid) => proofIds.includes(cid));
  });

  const isBlocked = attachedQuestions.length > 0;

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Update parent proof
      const updateData = {
        status: 'Draft',
        joint_exhibit_num: null,
        joint_by: null,
        joint_date: null,
      };
      await base44.entities.Proof.update(proof.id, updateData);

      // Update all children
      const children = proofs.filter((p) => p.parent_proof_id === proof.id);
      for (const child of children) {
        await base44.entities.Proof.update(child.id, updateData);
      }

      // Optionally unattach from all questions
      if (unattachAll) {
        for (const q of attachedQuestions) {
          const proofIds = Array.isArray(q.proof_ids) ? q.proof_ids : [];
          const childProofIds = proofs
            .filter((p) => p.parent_proof_id === proof.id)
            .map((p) => p.id);
          
          const updatedProofIds = proofIds.filter(
            (pid) => pid !== proof.id && !childProofIds.includes(pid)
          );
          
          await base44.entities.Question.update(q.id, {
            proof_ids: updatedProofIds,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setUnattachAll(false);
      onClose();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (isBlocked && !unattachAll) {
      alert('Proof is attached to questions. Please check "Unattach All & Downgrade" to proceed.');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove from Joint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Proof: {proof?.formal_name}</p>
              <p className="text-xs text-blue-700 mt-1">Current: Joint (Ex. {proof?.joint_exhibit_num})</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-medium text-slate-700">Status Flow:</div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                Joint
              </span>
              <ArrowUp className="w-4 h-4 text-slate-400 rotate-90" />
              <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                Draft
              </span>
            </div>
          </div>

          {isBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Attached to {attachedQuestions.length} Question{attachedQuestions.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Must unattach or remove before downgrading
                </p>
              </div>
            </div>
          )}

          {isBlocked && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Attached Questions:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {attachedQuestions.map((q) => (
                  <div key={q.id} className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                    <p className="font-medium">"{q.text}"</p>
                    <p className="text-slate-500 mt-1">Type: {q.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isBlocked && (
            <label className="flex items-start gap-3 p-3 border border-orange-200 bg-orange-50 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={unattachAll}
                onChange={(e) => setUnattachAll(e.target.checked)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-orange-900">
                  Unattach All & Downgrade to Draft
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Remove this proof from all attached questions and downgrade status
                </p>
              </div>
            </label>
          )}

          {!isBlocked && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
              <p className="text-xs text-slate-700">
                <strong>Details:</strong>
              </p>
              <ul className="text-xs text-slate-600 mt-2 space-y-1 ml-3">
                <li>• Proof will return to Draft status</li>
                <li>• Joint exhibit # will be cleared</li>
                <li>• Joint by & date will be cleared</li>
                <li>• All child proofs will also be downgraded</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending || (isBlocked && !unattachAll)}
              className={
                isBlocked && !unattachAll
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {updateMutation.isPending ? 'Downgrading...' : 'Remove from Joint'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}