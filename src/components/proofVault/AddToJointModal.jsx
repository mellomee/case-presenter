import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';

export default function AddToJointModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();
  const [jointExhibitNum, setJointExhibitNum] = useState('');
  const [jointBy, setJointBy] = useState('');

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Proof.update(proof.id, data);

      // Update all children to Joint status as well
      const children = proofs.filter((p) => p.parent_proof_id === proof.id);
      for (const child of children) {
        await base44.entities.Proof.update(child.id, {
          status: 'Joint',
          joint_exhibit_num: data.joint_exhibit_num,
          joint_by: data.joint_by,
          joint_date: new Date().toISOString().split('T')[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setJointExhibitNum('');
      setJointBy('');
      onClose();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!jointExhibitNum.trim()) {
      alert('Joint Exhibit # is required.');
      return;
    }
    if (!jointBy) {
      alert('Please select who is joining this exhibit.');
      return;
    }

    updateMutation.mutate({
      status: 'Joint',
      joint_exhibit_num: jointExhibitNum.trim(),
      joint_by: jointBy,
      joint_date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Joint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Proof: {proof?.formal_name}</p>
              <p className="text-xs text-blue-700 mt-1">Current: Draft</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Joint Exhibit # *
            </label>
            <Input
              placeholder="e.g. B-2"
              value={jointExhibitNum}
              onChange={(e) => setJointExhibitNum(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Format: Letter-Number (e.g., A-1, B-5, C-12)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Joined By *
            </label>
            <Select value={jointBy} onValueChange={setJointBy}>
              <SelectTrigger>
                <SelectValue placeholder="Select party..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Plaintiff">Plaintiff</SelectItem>
                <SelectItem value="Defense">Defense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Any child proofs (Extracts, Clips) will also be moved to Joint status.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? 'Adding...' : 'Add to Joint'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}