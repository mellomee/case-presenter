import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus } from 'lucide-react';

export default function RolesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const handleAddNew = () => {
    createMutation.mutate({ name: 'New Role' });
  };

  const handleEdit = (role) => {
    setEditingId(role.id);
    setEditName(role.name);
  };

  const handleSave = () => {
    updateMutation.mutate({ id: editingId, data: { name: editName } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">Party Roles</h3>
        <Button onClick={handleAddNew} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Role
        </Button>
      </div>

      <div className="space-y-2">
        {roles.map((role) => (
          <div key={role.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
            {editingId === role.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1"
                  placeholder="Role name"
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
                <p className="flex-1 font-medium text-slate-900">{role.name}</p>
                <Button onClick={() => handleEdit(role)} size="sm" variant="ghost">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={() => deleteMutation.mutate(role.id)} size="sm" variant="ghost" className="text-red-600">
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