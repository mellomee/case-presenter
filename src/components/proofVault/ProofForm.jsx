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
      name: '',
      formal_name: '',
      description: '',
      proof_category: 'Exhibit',
      file_type: 'PDF',
      proof_child_type: null,
      party_id: '',
      status: 'Draft',
      category_id: '',
      file_url: '',
      draft_exhibit_num: '',
      joint_exhibit_num: '',
      admitted_exhibit_num: '',
      demonstrative_exhibit_num: '',
      extract_pages: '',
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

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proof Category *</label>
            <Select
              value={formData.proof_category}
              onValueChange={(value) => setFormData({ ...formData, proof_category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Exhibit">Exhibit</SelectItem>
                <SelectItem value="Deposition">Deposition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">File Type *</label>
            <Select
              value={formData.file_type}
              onValueChange={(value) => setFormData({ ...formData, file_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="Image">Image</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Name *</label>
            <Input
              placeholder="Internal reference name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
            <Input
              placeholder="Formal/display name"
              value={formData.formal_name}
              onChange={(e) => setFormData({ ...formData, formal_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Associated Party</label>
            <Select
              value={formData.party_id}
              onValueChange={(value) => setFormData({ ...formData, party_id: value })}
            >
              <SelectTrigger>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Draft Exhibit #</label>
            <Input
              placeholder="e.g., D-1"
              value={formData.draft_exhibit_num}
              onChange={(e) => setFormData({ ...formData, draft_exhibit_num: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Joint Exhibit #</label>
            <Input
              placeholder="e.g., J-1"
              value={formData.joint_exhibit_num}
              onChange={(e) => setFormData({ ...formData, joint_exhibit_num: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admitted Exhibit #</label>
            <Input
              placeholder="e.g., 1"
              value={formData.admitted_exhibit_num}
              onChange={(e) => setFormData({ ...formData, admitted_exhibit_num: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Demonstrative #</label>
            <Input
              placeholder="e.g., X-1"
              value={formData.demonstrative_exhibit_num}
              onChange={(e) => setFormData({ ...formData, demonstrative_exhibit_num: e.target.value })}
            />
          </div>
        </div>

        {formData.file_type === 'PDF' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Page Range (Extract)</label>
            <Input
              placeholder="e.g., 1-3, 5, 13-18"
              value={formData.extract_pages}
              onChange={(e) => setFormData({ ...formData, extract_pages: e.target.value })}
            />
          </div>
        )}

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