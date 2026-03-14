import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TrialPointModal({ trialPoint, categories, onSubmit, onCancel, isLoading }) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    setName(trialPoint?.name || '');
    setCategoryId(trialPoint?.category_id || '');
  }, [trialPoint]);

  const handleSubmit = () => {
    if (!name.trim()) return alert('Name is required');
    onSubmit({ name: name.trim(), category_id: categoryId || null });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">Trial Point Name *</label>
        <Input
          placeholder="e.g. Liability, Pain & Suffering, Chain of Custody"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">Category (optional)</label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>None</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
          {isLoading ? 'Saving…' : trialPoint ? 'Update Trial Point' : 'Create Trial Point'}
        </Button>
      </div>
    </div>
  );
}