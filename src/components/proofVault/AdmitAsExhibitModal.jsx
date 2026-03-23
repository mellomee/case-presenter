import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdmitAsExhibitModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();
  const [admittedExhibitNum, setAdmittedExhibitNum] = useState('');
  const [admittedBy, setAdmittedBy] = useState('');

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const admitDate = new Date().toISOString().split('T')[0];
      const updateData = { ...data, admit_date: admitDate };
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
      setAdmittedBy('');
      onClose();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!admittedExhibitNum.trim()) {
      alert('Admitted Exhibit # is required.');
      return;
    }
    if (!admittedBy) {
      alert('Please select who admitted this exhibit.');
      return;
    }

    updateMutation.mutate({
      status: 'Admitted',
      admitted_exhibit_num: admittedExhibitNum.trim(),
      admitted_by: admittedBy,
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admitted Exhibit # *
            </label>
            <Input
              placeholder="e.g. C-3"
              value={admittedExhibitNum}
              onChange={(e) => setAdmittedExhibitNum(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Format: Letter-Number (e.g., A-1, C-5)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admitted By *
            </label>
            <Select value={admittedBy} onValueChange={setAdmittedBy}>
              <SelectTrigger>
                <SelectValue placeholder="Select party..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Plaintiff">Plaintiff</SelectItem>
                <SelectItem value="Defense">Defense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-slate-600">
            <p><strong>Admit Date:</strong> {new Date().toLocaleDateString()}</p>
          </div>

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