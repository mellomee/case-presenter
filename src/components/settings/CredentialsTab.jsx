import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus } from 'lucide-react';

export default function CredentialsTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.Credential.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Credential.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credentials'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Credential.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Credential.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credentials'] }),
  });

  const handleAddNew = () => {
    createMutation.mutate({ name: 'New Credential' });
  };

  const handleEdit = (cred) => {
    setEditingId(cred.id);
    setEditName(cred.name);
  };

  const handleSave = () => {
    updateMutation.mutate({ id: editingId, data: { name: editName } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">Party Credentials</h3>
        <Button onClick={handleAddNew} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Credential
        </Button>
      </div>

      <div className="space-y-2">
        {credentials.map((cred) => (
          <div key={cred.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
            {editingId === cred.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1"
                  placeholder="Credential name"
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
                <p className="flex-1 font-medium text-slate-900">{cred.name}</p>
                <Button onClick={() => handleEdit(cred)} size="sm" variant="ghost">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={() => deleteMutation.mutate(cred.id)} size="sm" variant="ghost" className="text-red-600">
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