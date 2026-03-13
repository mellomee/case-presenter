import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit2 } from 'lucide-react';

export default function ProofTypeTab() {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const queryClient = useQueryClient();

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProofTypeCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofTypes'] });
      setNewName('');
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofTypes'] });
    },
  });

  const handleCreate = () => {
    if (newName.trim()) {
      createMutation.mutate({ name: newName, template_questions: {} });
    }
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setEditName(type.name);
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      updateMutation.mutate({ id: editingId, data: { name: editName } });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Proof Type</h3>
        <div className="flex gap-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Photo, Video, Business Record"
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {proofTypes.map((type) => (
          <Card key={type.id} className="p-4 border-slate-200 flex items-center justify-between">
            <span className="text-slate-900 font-medium">{type.name}</span>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(type)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Proof Type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit_name">Name</Label>
                      <Input
                        id="edit_name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline">Cancel</Button>
                      <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(type.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}