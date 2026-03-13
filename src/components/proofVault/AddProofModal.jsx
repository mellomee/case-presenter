import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import FileUploadProgress from './FileUploadProgress';

export default function AddProofModal({ open, onOpenChange }) {
  const [category, setCategory] = useState('Exhibit');
  const [fileType, setFileType] = useState('PDF');
  const [name, setName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Draft');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [file, setFile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const fileTypeOptions =
    category === 'Deposition' ? ['PDF', 'Video'] : ['PDF', 'Image', 'Video'];

  const createProofMutation = useMutation({
    mutationFn: async (proofData) => {
      return base44.entities.Proof.create(proofData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      resetForm();
      onOpenChange(false);
    },
  });

  const handleFileSelect = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !formalName || !file) {
      alert('Please fill in all required fields');
      return;
    }

    const uploadId = Date.now();
    setUploads((prev) => [
      ...prev,
      { id: uploadId, filename: file.name, progress: 0, status: 'uploading' },
    ]);

    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });

      const proofData = {
        proof_category: category,
        file_type: fileType,
        name,
        formal_name: formalName,
        description,
        status,
        file_url: uploadedFile.file_url,
      };

      if (category === 'Exhibit' && draftExhibitNum) {
        proofData.draft_exhibit_num = draftExhibitNum;
      }

      await createProofMutation.mutateAsync(proofData);

      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u
        )
      );

      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      }, 2000);
    } catch (error) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, status: 'error', error: error.message } : u
        )
      );
    }
  };

  const resetForm = () => {
    setCategory('Exhibit');
    setFileType('PDF');
    setName('');
    setFormalName('');
    setDescription('');
    setStatus('Draft');
    setDraftExhibitNum('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    if (newCategory === 'Deposition' && fileType === 'Image') {
      setFileType('PDF');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Proof</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exhibit">Exhibit</SelectItem>
                    <SelectItem value="Deposition">Deposition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">File Type</Label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fileTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Internal Name *</Label>
              <Input
                placeholder="e.g., Invoice #123"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs">Formal/Display Name *</Label>
              <Input
                placeholder="How it appears in court"
                value={formalName}
                onChange={(e) => setFormalName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Optional notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-20"
              />
            </div>

            {category === 'Exhibit' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Joint">Joint</SelectItem>
                      <SelectItem value="Admitted">Admitted</SelectItem>
                      <SelectItem value="Demonstrative">Demonstrative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Exhibit # (optional)</Label>
                  <Input
                    placeholder="e.g., A-1"
                    value={draftExhibitNum}
                    onChange={(e) => setDraftExhibitNum(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">File *</Label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  {file ? file.name : 'Click to select file'}
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.mp4,.webm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProofMutation.isPending}
                className="flex-1"
              >
                {createProofMutation.isPending ? 'Creating...' : 'Create Proof'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {uploads.length > 0 && <FileUploadProgress uploads={uploads} />}
    </>
  );
}