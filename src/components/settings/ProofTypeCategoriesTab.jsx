import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ProofTypeCategoriesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const queryClient = useQueryClient();

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypeCategories'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProofTypeCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofTypeCategories'] });
      setShowForm(false);
      setFormData({ name: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProofTypeCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofTypeCategories'] });
      setEditingItem(null);
      setFormData({ name: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const admissionBlocks = await base44.entities.AdmissionBlock.filter({ proof_type_category_id: id });
      if (admissionBlocks.length > 0) {
        throw new Error(`This category is used by ${admissionBlocks.length} admission blocks.`);
      }
      return base44.entities.ProofTypeCategory.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofTypeCategories'] });
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
        <h3 className="text-lg font-semibold text-slate-900">Proof Type Categories</h3>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Add Type
        </Button>
      </div>

      <div className="space-y-2">
        {proofTypes.map((pt) => (
          <div key={pt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-900 font-medium">{pt.name}</span>
              <p className="text-xs text-slate-500 mt-1">Used for admission template defaults</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(pt)}
                className="text-slate-600 hover:text-blue-600"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(pt.id)}
                className="text-slate-600 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {proofTypes.length === 0 && (
          <p className="text-slate-500 text-center py-8">No proof types yet. Create one to get started.</p>
        )}
      </div>

      <Dialog open={showForm || !!editingItem} onOpenChange={handleCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Proof Type' : 'Add Proof Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Type Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="e.g. Photo, Video, Business Record, Medical Record"
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