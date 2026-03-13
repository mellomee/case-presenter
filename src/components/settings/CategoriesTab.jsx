import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus } from 'lucide-react';

export default function CategoriesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleAddNew = () => {
    createMutation.mutate({ name: 'New Category', description: '' });
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setEditValues(category);
  };

  const handleSave = () => {
    updateMutation.mutate({ id: editingId, data: editValues });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">Proof Categories</h3>
        <Button onClick={handleAddNew} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
            {editingId === cat.id ? (
              <>
                <Input
                  value={editValues.name}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  className="flex-1"
                  placeholder="Category name"
                />
                <Input
                  value={editValues.description || ''}
                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                  className="flex-1"
                  placeholder="Description (optional)"
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
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{cat.name}</p>
                  {cat.description && <p className="text-xs text-slate-600">{cat.description}</p>}
                </div>
                <Button onClick={() => handleEdit(cat)} size="sm" variant="ghost">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={() => deleteMutation.mutate(cat.id)} size="sm" variant="ghost" className="text-red-600">
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