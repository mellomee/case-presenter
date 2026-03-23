import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';

export default function AdmitAsExhibitModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();
  const [admittedExhibitNum, setAdmittedExhibitNum] = useState('');
  const [admittedBy, setAdmittedBy] = useState('');

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const parentProof = useMemo(
    () => (proof?.parent_proof_id ? proofs.find((item) => item.id === proof.parent_proof_id) || null : null),
    [proof?.parent_proof_id, proofs]
  );
  const isTopLevelProof = !proof?.parent_proof_id;

  useEffect(() => {
    if (!open) return;
    setAdmittedExhibitNum(proof?.admitted_exhibit_num || '');
    setAdmittedBy(proof?.admitted_by || '');
  }, [open, proof?.id, proof?.admitted_exhibit_num, proof?.admitted_by]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (!proof?.id) return;

      await base44.entities.Proof.update(proof.id, data);

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
          status: 'Admitted',
          admitted_exhibit_num: data.admitted_exhibit_num,
          admitted_by: data.admitted_by,
          admit_date: data.admit_date,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
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
      admit_date: new Date().toISOString().split('T')[0],
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
              <p className="text-xs text-green-700 mt-1">Current: Joint (Ex. {proof?.joint_exhibit_num || parentProof?.joint_exhibit_num || '—'})</p>
              {parentProof && <p className="text-xs text-green-700 mt-1">Parent Proof: {parentProof.formal_name || parentProof.name}</p>}
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
              <strong>Note:</strong> {isTopLevelProof
                ? 'This proof and its child proofs will be publishable to the Jury.'
                : 'Only this child proof will be marked Admitted. The parent proof stays Joint unless it is admitted separately.'}
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