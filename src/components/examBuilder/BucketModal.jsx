import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BucketModal({ bucket, trialPoints, onSubmit, onCancel, isLoading }) {
  const [name, setName] = useState(bucket?.name || '');
  const [trialPointId, setTrialPointId] = useState(bucket?.trial_point_id || '');

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Bucket name is required');
      return;
    }

    onSubmit({
      name: name.trim(),
      trial_point_id: trialPointId || null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Bucket Name *
        </label>
        <Input
          placeholder="e.g. Scene Photos, Medical Records, Liability Timeline"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Map to Trial Point (optional)
        </label>
        <Select value={trialPointId} onValueChange={setTrialPointId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a trial point" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>None</SelectItem>
            {trialPoints.map((tp) => (
              <SelectItem key={tp.id} value={tp.id}>
                {tp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Saving...' : bucket ? 'Update Bucket' : 'Create Bucket'}
        </Button>
      </div>
    </div>
  );
}