import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit2 } from 'lucide-react';

const STEPS = ['1', '2', '3', '3.1', '3.2', '3.3', '3.4', '3.5', '4', '5'];

export default function AdmissionTemplateTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    proof_type_category_id: '',
    step: '1',
    default_text: '',
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['admissionTemplates'],
    queryFn: () => base44.entities.AdmissionTemplate.list(),
  });

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AdmissionTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissionTemplates'] });
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdmissionTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissionTemplates'] });
      resetForm();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AdmissionTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissionTemplates'] });
    },
  });

  const resetForm = () => {
    setFormData({ proof_type_category_id: '', step: '1', default_text: '' });
    setEditingId(null);
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setFormData({
      proof_type_category_id: template.proof_type_category_id,
      step: template.step,
      default_text: template.default_text,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (formData.proof_type_category_id && formData.default_text.trim()) {
      if (editingId) {
        updateMutation.mutate({ id: editingId, data: formData });
      } else {
        createMutation.mutate(formData);
      }
    }
  };

  const getProofTypeName = (id) => {
    return proofTypes.find((t) => t.id === id)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'Add Admission Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proof_type">Proof Type Category</Label>
              <Select value={formData.proof_type_category_id} onValueChange={(val) => setFormData({ ...formData, proof_type_category_id: val })}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select proof type" />
                </SelectTrigger>
                <SelectContent>
                  {proofTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="step">Step</Label>
              <Select value={formData.step} onValueChange={(val) => setFormData({ ...formData, step: val })}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select step" />
                </SelectTrigger>
                <SelectContent>
                  {STEPS.map((s) => (
                    <SelectItem key={s} value={s}>
                      Step {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="default_text">Default Question Text</Label>
              <Textarea
                id="default_text"
                value={formData.default_text}
                onChange={(e) => setFormData({ ...formData, default_text: e.target.value })}
                placeholder="Use {{exhibit_num}} as placeholder"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">Use {{exhibit_num}} as placeholder for exhibit number</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id} className="p-4 border-slate-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-slate-900">{getProofTypeName(template.proof_type_category_id)} — Step {template.step}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(template)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(template.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-600">{template.default_text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}