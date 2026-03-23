import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';
import ProofAdmissionFields from '@/components/proofVault/ProofAdmissionFields.jsx';
import { getTodayDateString, isProofAdmissionNumberUsed } from '@/lib/proofAdmissionUtils';

export default function AdmitAsExhibitModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();
  const [admittedExhibitNum, setAdmittedExhibitNum] = useState('');
  const [admittedBy, setAdmittedBy] = useState('Plaintiff');
  const [admitDate, setAdmitDate] = useState(getTodayDateString());

  useEffect(() => {
    if (!open) return;
    setAdmittedExhibitNum('');
    setAdmittedBy('Plaintiff');
    setAdmitDate(getTodayDateString());
  }, [open, proof?.id]);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = { ...data };
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
      setAdmittedExhibitNum('');
      setAdmittedBy('Plaintiff');
      setAdmitDate(getTodayDateString());
      onClose();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    const nextExhibitNum = admittedExhibitNum.trim();

    if (!nextExhibitNum) {
      alert('Admitted Exhibit # is required.');
      return;
    }
    if (!admittedBy) {
      alert('Please choose who admitted this proof.');
      return;
    }
    if (!admitDate) {
      alert('Admitted date is required.');
      return;
    }
    if (isProofAdmissionNumberUsed(proofs, proof, nextExhibitNum)) {
      alert('That exhibit # is already in use. Please enter a different one.');
      return;
    }

    updateMutation.mutate({
      status: 'Admitted',
      admitted_exhibit_num: nextExhibitNum,
      admitted_by: admittedBy,
      admit_date: admitDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Admit as Exhibit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-3 flex gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Proof: {proof?.name}</p>
              <p className="text-xs text-green-700 mt-1">Current: Joint (Ex. {proof?.joint_exhibit_num})</p>
            </div>
          </div>

          <ProofAdmissionFields
            exhibitNumberLabel="Admitted Exhibit #"
            exhibitNumber={admittedExhibitNum}
            onExhibitNumberChange={setAdmittedExhibitNum}
            admittedBy={admittedBy}
            onAdmittedByChange={setAdmittedBy}
            admitDate={admitDate}
            onAdmitDateChange={setAdmitDate}
          />

          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-xs text-green-800">
              <strong>Note:</strong> This proof will be publishable to the Jury. All child proofs (Extracts, Clips) will also be marked Admitted.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? 'Admitting...' : 'Admit as Exhibit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}