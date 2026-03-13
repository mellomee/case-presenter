import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function AddProofModal({ open, onOpenChange, onSuccess }) {
  const queryClient = useQueryClient();
  const [proofCategory, setProofCategory] = useState('');
  const [fileType, setFileType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    formal_name: '',
    description: '',
    party_id: '',
    category_id: '',
    status: 'Draft',
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list().catch(() => []),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list().catch(() => []),
  });

  const createProofMutation = useMutation({
    mutationFn: (data) => base44.entities.Proof.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!proofCategory || !fileType || !formData.name || !formData.formal_name) {
      alert('Please fill in required fields');
      return;
    }

    createProofMutation.mutate({
      ...formData,
      proof_category: proofCategory,
      file_type: fileType,
    });
  };

  const resetForm = () => {
    setProofCategory('');
    setFileType('');
    setFormData({
      name: '',
      formal_name: '',
      description: '',
      party_id: '',
      category_id: '',
      status: 'Draft',
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Proof</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Proof Category *</Label>
              <Select value={proofCategory} onValueChange={setProofCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Exhibit">Exhibit</SelectItem>
                  <SelectItem value="Deposition">Deposition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fileType">File Type *</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger id="fileType">
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Image">Image</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Internal Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Exhibit A"
              />
            </div>
            <div>
              <Label htmlFor="formal_name">Display/Formal Name *</Label>
              <Input
                id="formal_name"
                value={formData.formal_name}
                onChange={(e) => handleInputChange('formal_name', e.target.value)}
                placeholder="e.g., Contract Agreement"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          {/* Party and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="party">Party</Label>
              <Select value={formData.party_id} onValueChange={(value) => handleInputChange('party_id', value)}>
                <SelectTrigger id="party">
                  <SelectValue placeholder="Select party" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.first_name} {party.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Joint">Joint</SelectItem>
                <SelectItem value="Admitted">Admitted</SelectItem>
                <SelectItem value="Demonstrative">Demonstrative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProofMutation.isPending}>
              {createProofMutation.isPending ? 'Creating...' : 'Create Proof'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}