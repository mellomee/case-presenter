import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus } from 'lucide-react';

export default function ProofTypeTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const { data: types = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })),
    [types]
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProofTypeCategory.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofTypes'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProofTypeCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofTypes'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProofTypeCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofTypes'] }),
  });

  const handleAddNew = () => {
    createMutation.mutate({ name: 'New Type' });
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setEditName(type.name);
  };

  const handleSave = () => {
    updateMutation.mutate({ id: editingId, data: { name: editName } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">Proof Type Categories</h3>
        <Button onClick={handleAddNew} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Type
        </Button>
      </div>

      <div className="space-y-2">
        {sortedTypes.map((type) => (
          <div key={type.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
            {editingId === type.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1"
                  placeholder="Type name"
                />
                <Button onClick={handleSave} size="sm" variant="default">
                  Save
                </Button>
                <Button onClick={() => setEditingId(null)} size="sm" variant="outline">
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <p className="flex-1 font-medium text-slate-900">{type.name}</p>
                <Button onClick={() => handleEdit(type)} size="sm" variant="ghost">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={() => deleteMutation.mutate(type.id)} size="sm" variant="ghost" className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}