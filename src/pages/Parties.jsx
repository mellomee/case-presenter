import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PartyForm from '@/components/parties/PartyForm';
import PartyCard from '@/components/parties/PartyCard';

export default function Parties() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [filterType, setFilterType] = useState('all');

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
    mutationFn: (id) => base44.entities.Party.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parties'] }),
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
    filterType === 'all' ? parties : parties.filter((p) => p.party_type === filterType);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Parties</h2>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Party
          </Button>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingParty ? 'Edit Party' : 'Add Party'}</DialogTitle>
            </DialogHeader>
            <PartyForm party={editingParty} onSubmit={handleSubmit} onCancel={handleCancel} />
          </DialogContent>
        </Dialog>

        <div className="mb-6 flex gap-2">
          {['all', 'plaintiff', 'defense', 'neutral'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(type)}
              className={filterType === type ? 'bg-blue-600' : ''}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        {filteredParties.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">No parties added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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