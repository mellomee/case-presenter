import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

export default function CategoriesTab() {
  const [newName, setNewName] = useState('');
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleCreate = () => {
    if (newName.trim()) {
      createMutation.mutate({ name: newName });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Category</h3>
        <div className="flex gap-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {categories.map((cat) => (
          <Card key={cat.id} className="p-4 border-slate-200 flex items-center justify-between">
            <span className="text-slate-900 font-medium">{cat.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(cat.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}