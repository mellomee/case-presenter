import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function PartyForm({ party, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(
    party || {
      name: '',
      party_type: 'plaintiff',
      role_id: '',
      credentials: [],
      notes: '',
      color: 'green',
    }
  );

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.Credential.list(),
  });

  useEffect(() => {
    if (formData.party_type === 'plaintiff' || formData.party_type === 'neutral') {
      setFormData((prev) => ({ ...prev, color: 'green' }));
    } else {
      setFormData((prev) => ({ ...prev, color: 'red' }));
    }
  }, [formData.party_type]);

  const handleCredentialToggle = (credId) => {
    setFormData((prev) => ({
      ...prev,
      credentials: prev.credentials.includes(credId)
        ? prev.credentials.filter((id) => id !== credId)
        : [...prev.credentials, credId],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Full name"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1">Party Type *</label>
          <Select value={formData.party_type} onValueChange={(value) => setFormData({ ...formData, party_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plaintiff">Plaintiff / Direct</SelectItem>
              <SelectItem value="defense">Defense / Cross</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1">Role</label>
          <Select value={formData.role_id || ''} onValueChange={(value) => setFormData({ ...formData, role_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">Credentials</label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {credentials.map((cred) => (
            <label key={cred.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.credentials.includes(cred.id)}
                onCheckedChange={() => handleCredentialToggle(cred.id)}
              />
              <span className="text-sm text-slate-700">{cred.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">Notes</label>
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {party ? 'Update Party' : 'Add Party'}
        </Button>
      </div>
    </form>
  );
}