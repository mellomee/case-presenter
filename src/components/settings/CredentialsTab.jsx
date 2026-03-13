import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CredentialsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const queryClient = useQueryClient();

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.Credential.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Credential.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setShowForm(false);
      setFormData({ name: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Credential.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setEditingItem(null);
      setFormData({ name: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const parties = await base44.entities.Party.list();
      const usedCount = parties.filter((p) => {
        const creds = p.credentials || [];
        return Array.isArray(creds) && creds.includes(id);
      }).length;
      
      if (usedCount > 0) {
        throw new Error(`This credential is used by ${usedCount} parties.`);
      }
      return base44.entities.Credential.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
    onError: (error) => {
      alert(`Cannot delete: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ name: item.name });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({ name: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Credentials</h3>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Add Credential
        </Button>
      </div>

      <div className="space-y-2">
        {credentials.map((cred) => (
          <div key={cred.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-900 font-medium">{cred.name}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(cred)}
                className="text-slate-600 hover:text-blue-600"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(cred.id)}
                className="text-slate-600 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {credentials.length === 0 && (
          <p className="text-slate-500 text-center py-8">No credentials yet. Create one to get started.</p>
        )}
      </div>

      <Dialog open={showForm || !!editingItem} onOpenChange={handleCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Credential' : 'Add Credential'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Credential Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="e.g. MD, PhD, CPA, PE"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}