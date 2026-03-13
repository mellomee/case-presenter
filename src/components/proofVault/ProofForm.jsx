import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { X, Upload } from 'lucide-react';

export default function ProofForm({ proof, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(
    proof || {
      title: '',
      description: '',
      proof_type_id: '',
      category_id: '',
      file_url: '',
      exhibit_number: '',
      notes: '',
    }
  );
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(file.name);
      setFormData({ ...formData, file_url: response.file_url });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <Input
            placeholder="Exhibit title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Exhibit Number</label>
          <Input
            placeholder="e.g., Exhibit A, Exhibit 1"
            value={formData.exhibit_number}
            onChange={(e) => setFormData({ ...formData, exhibit_number: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proof Type</label>
            <Select
              value={formData.proof_type_id}
              onValueChange={(value) => setFormData({ ...formData, proof_type_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <Textarea
            placeholder="Detailed description of the proof"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="h-20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">File</label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
            {uploadedFile ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{uploadedFile}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile(null);
                    setFormData({ ...formData, file_url: '' });
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-700">Click to upload</span>
                <span className="text-xs text-slate-500">PDF, images, or videos</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <Textarea
            placeholder="Additional notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="h-16"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
           <Button type="button" variant="outline" onClick={onCancel}>
             Cancel
           </Button>
           <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
             {proof ? 'Update Proof' : 'Add Proof'}
           </Button>
         </div>
        </form>
        );
}