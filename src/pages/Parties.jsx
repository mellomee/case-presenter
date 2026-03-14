import React, { useState } from 'react';
import { Users, Plus, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PartyForm from '@/components/parties/PartyForm';
import PartyCard from '@/components/parties/PartyCard';
import PartyImportModal from '@/components/parties/PartyImportModal';

export default function Parties() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Party.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Party.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      setEditingParty(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const questions = await base44.entities.Question.list();
      const hasQuestions = questions.some((q) => q.party_id === id);

      const buckets = await base44.entities.Bucket.list();
      const hasBuckets = buckets.some((b) => b.party_id === id);

      const proofs = await base44.entities.Proof.list();
      const hasProofs = proofs.some((p) => p.party_id === id);

      if (hasQuestions || hasBuckets || hasProofs) {
        throw new Error('This party has associated proofs, buckets, or questions. Reassign or delete them first.');
      }

      return base44.entities.Party.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parties'] }),
    onError: (error) => {
      alert(`Cannot delete: ${error.message}`);
    },
  });

  const handleSubmit = (formData) => {
    if (editingParty) {
      updateMutation.mutate({ id: editingParty.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (party) => {
    setEditingParty(party);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingParty(null);
    setShowForm(false);
  };

  const filteredParties =
    filterType === 'all' ? parties : parties.filter((p) => p.side === filterType);

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Parties</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowImportModal(true)} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Party
            </Button>
          </div>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingParty ? 'Edit Party' : 'Add Party'}</DialogTitle>
            </DialogHeader>
            <PartyForm party={editingParty} onSubmit={handleSubmit} onCancel={handleCancel} />
          </DialogContent>
        </Dialog>

        <PartyImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            queryClient.invalidateQueries({ queryKey: ['parties'] });
          }}
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'Plaintiff', 'Defense', 'Neutral'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(type)}
              className={filterType === type ? 'bg-blue-600' : ''}
            >
              {type === 'all' ? 'All' : type}
            </Button>
          ))}
        </div>

        {filteredParties.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">
              {filterType === 'all' ? 'No parties added yet.' : `No ${filterType} parties.`}
            </p>
            {filterType === 'all' && (
              <p className="text-sm text-slate-400 mt-1">Add witnesses, experts, and other parties to get started.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map((party) => (
              <PartyCard
                key={party.id}
                party={party}
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