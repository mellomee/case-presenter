import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';

function getDescendantProofs(allProofs = [], parentId) {
  const directChildren = allProofs.filter((item) => item.parent_proof_id === parentId);
  return directChildren.flatMap((child) => [child, ...getDescendantProofs(allProofs, child.id)]);
}

export default function AddToJointModal({ open, onClose, proof }) {
  const queryClient = useQueryClient();
  const [jointExhibitNum, setJointExhibitNum] = useState('');
  const [jointBy, setJointBy] = useState('');
  const [formalName, setFormalName] = useState('');
  const [selectedPartyIds, setSelectedPartyIds] = useState([]);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['jointModalParties'],
    queryFn: () => base44.entities.Party.list(),
  });

  useEffect(() => {
    if (!open) return;
    setJointExhibitNum('');
    setJointBy('');
    setFormalName(proof?.formal_name || '');
    const initialPartyIds = Array.isArray(proof?.party_ids?.ids)
      ? proof.party_ids.ids
      : proof?.party_id
        ? [proof.party_id]
        : [];
    setSelectedPartyIds(initialPartyIds);
  }, [open, proof]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const lineage = [proof, ...getDescendantProofs(proofs, proof.id)].filter(Boolean);
      const jointDate = new Date().toISOString().split('T')[0];

      for (const item of lineage) {
        await base44.entities.Proof.update(item.id, {
          status: 'Joint',
          formal_name: item.id === proof.id ? data.formal_name : item.formal_name,
          joint_exhibit_num: data.joint_exhibit_num,
          joint_by: data.joint_by,
          joint_date: jointDate,
          party_ids: data.party_ids,
          party_id: data.party_id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setJointExhibitNum('');
      setJointBy('');
      setFormalName('');
      onClose();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!formalName.trim()) {
      alert('Formal Name is required before moving an exhibit out of Draft.');
      return;
    }
    if (!jointExhibitNum.trim()) {
      alert('Joint Exhibit # is required.');
      return;
    }
    if (!jointBy) {
      alert('Please select who is joining this exhibit.');
      return;
    }
    if (selectedPartyIds.length === 0) {
      alert('Please attach at least one party before moving this proof to Joint.');
      return;
    }

    updateMutation.mutate({
      status: 'Joint',
      formal_name: formalName.trim(),
      joint_exhibit_num: jointExhibitNum.trim(),
      joint_by: jointBy,
      joint_date: new Date().toISOString().split('T')[0],
      party_ids: { ids: selectedPartyIds },
      party_id: selectedPartyIds.length === 1 ? selectedPartyIds[0] : null,
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
              <p className="text-sm font-medium text-blue-900">Proof: {proof?.name}</p>
              <p className="text-xs text-blue-700 mt-1">Current: Draft</p>
            </div>
          </div>

          {!proof?.formal_name?.trim() && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Formal Name *
              </label>
              <Input
                placeholder="Enter formal name"
                value={formalName}
                onChange={(e) => setFormalName(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">A Formal Name is required for Joint proofs.</p>
            </div>
          )}

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
                <SelectValue placeholder="Select side..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Plaintiff">Plaintiff</SelectItem>
                <SelectItem value="Defense">Defense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Attached Parties *
            </label>
            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 p-3 space-y-2">
              {parties.map((party) => (
                <label key={party.id} className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedPartyIds.includes(party.id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedPartyIds((prev) => [...prev, party.id]);
                      } else {
                        setSelectedPartyIds((prev) => prev.filter((id) => id !== party.id));
                      }
                    }}
                  />
                  <span>{party.first_name} {party.last_name}</span>
                  <span className="text-xs text-slate-400">{party.side}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Joint exhibits must be attached to one or more parties.</p>
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