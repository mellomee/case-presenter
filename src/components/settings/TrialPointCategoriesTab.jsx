import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';

export default function TrialPointCategoriesTab() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['trialPointCategories'],
    queryFn: () => base44.entities.TrialPointCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.TrialPointCategory.create({ name, sort_order: categories.length }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trialPointCategories'] }); setNewName(''); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.TrialPointCategory.update(id, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trialPointCategories'] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrialPointCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trialPointCategories'] }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  const startEdit = (cat) => { setEditingId(cat.id); setEditingName(cat.name); };
  const commitEdit = () => { if (!editingName.trim()) return; updateMutation.mutate({ id: editingId, name: editingName.trim() }); };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Trial Point Categories</h3>
        <p className="text-sm text-slate-500">Used to group and label trial points (e.g. Liability, Damages, Foundation).</p>
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="New category name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1"
        />
        <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {categories.length === 0 && (
          <p className="text-sm text-slate-400 italic">No categories yet.</p>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            {editingId === cat.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={commitEdit}><Check className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-slate-800">{cat.name}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => startEdit(cat)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}