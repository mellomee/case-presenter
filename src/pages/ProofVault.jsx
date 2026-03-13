import React, { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProofForm from '@/components/proofVault/ProofForm';
import ProofCard from '@/components/proofVault/ProofCard';

export default function ProofVault() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProof, setEditingProof] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Proof.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proof.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setEditingProof(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Proof.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofs'] }),
  });

  const handleSubmit = (formData) => {
    if (editingProof) {
      updateMutation.mutate({ id: editingProof.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (proof) => {
    setEditingProof(proof);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingProof(null);
    setShowForm(false);
  };

  const filteredProofs =
    filterStatus === 'all' ? proofs : proofs.filter((p) => p.status === filterStatus);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Proof Vault</h2>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Proof
          </Button>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProof ? 'Edit Proof' : 'Add Proof'}</DialogTitle>
            </DialogHeader>
            <ProofForm proof={editingProof} onSubmit={handleSubmit} onCancel={handleCancel} />
          </DialogContent>
        </Dialog>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'bg-blue-600' : ''}
          >
            All Proofs ({proofs.length})
          </Button>
          {['Draft', 'Joint', 'Admitted', 'Demonstrative'].map((status) => {
            const count = proofs.filter((p) => p.status === status).length;
            return (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? 'bg-blue-600' : ''}
              >
                {status} ({count})
              </Button>
            );
          })}
        </div>

        {filteredProofs.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">No proofs added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProofs.map((proof) => (
              <ProofCard
                key={proof.id}
                proof={proof}
                onEdit={handleEdit}
                onDelete={deleteMutation.mutate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}