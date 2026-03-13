import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Upload, Loader } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function AddProofModal({ open, onOpenChange }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    proof_category: 'Exhibit',
    file_type: 'PDF',
    name: '',
    formal_name: '',
    description: '',
    video_url: '',
  });
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const createProofMutation = useMutation({
    mutationFn: async (proofData) => {
      return base44.entities.Proof.create(proofData);
    },
    onSuccess: (newProof) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      base44.entities.ActivityLog.create({
        action: 'Created proof',
        entity_type: 'Proof',
        entity_id: newProof.id,
        details: { category: formData.proof_category, file_type: formData.file_type },
      }).catch(() => {});
      resetForm();
      onOpenChange(false);
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response;
    },
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFormData((prev) => ({
        ...prev,
        name: selectedFile.name.replace(/\.[^/.]+$/, ''),
        formal_name: selectedFile.name,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      proof_category: 'Exhibit',
      file_type: 'PDF',
      name: '',
      formal_name: '',
      description: '',
      video_url: '',
    });
    setFile(null);
    setUploadProgress(0);
    setStep(1);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.formal_name) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.file_type === 'Video' && !formData.video_url && !file) {
      alert('Please provide a video URL or upload a video file');
      return;
    }

    if (file && formData.file_type !== 'Video') {
      try {
        setUploadProgress(10);
        const response = await uploadFileMutation.mutateAsync(file);
        setUploadProgress(100);
        createProofMutation.mutate({
          ...formData,
          file_url: response.file_url,
          status: 'Draft',
        });
      } catch (error) {
        alert('File upload failed');
        setUploadProgress(0);
      }
    } else if (formData.file_type === 'Video' && formData.video_url) {
      createProofMutation.mutate({
        ...formData,
        video_url: formData.video_url,
        status: 'Draft',
      });
    } else if (file && formData.file_type === 'Video') {
      try {
        setUploadProgress(10);
        const response = await uploadFileMutation.mutateAsync(file);
        setUploadProgress(100);
        createProofMutation.mutate({
          ...formData,
          video_url: response.file_url,
          status: 'Draft',
        });
      } catch (error) {
        alert('File upload failed');
        setUploadProgress(0);
      }
    }
  };

  const isDeposition = formData.proof_category === 'Deposition';
  const isVideo = formData.file_type === 'Video';

  const fileTypeOptions = isDeposition ? ['PDF', 'Video'] : ['PDF', 'Image', 'Video'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Proof</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category & File Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Proof Category *</Label>
              <Select value={formData.proof_category} onValueChange={(val) => setFormData((prev) => ({ ...prev, proof_category: val }))}>
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
              <Label className="text-sm font-medium mb-2 block">File Type *</Label>
              <Select value={formData.file_type} onValueChange={(val) => setFormData((prev) => ({ ...prev, file_type: val }))}>
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

          {/* Names */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">Internal Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Email 1, Photo A"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Formal Name *</Label>
              <Input
                value={formData.formal_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, formal_name: e.target.value }))}
                placeholder="e.g., Plaintiff's Email dated 3/15/24"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Description (Optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Add context or notes"
              rows={3}
            />
          </div>

          {/* File Upload */}
          {!isVideo ? (
            <div>
              <Label className="text-sm font-medium mb-3 block">Upload File *</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition cursor-pointer">
                <input type="file" onChange={handleFileSelect} className="hidden" id="file-input" accept={formData.file_type === 'PDF' ? '.pdf' : 'image/*'} />
                <label htmlFor="file-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">{file ? file.name : 'Click to upload or drag and drop'}</p>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Video URL (Optional)</Label>
                <Input value={formData.video_url} onChange={(e) => setFormData((prev) => ({ ...prev, video_url: e.target.value }))} placeholder="e.g., https://example.com/video.mp4" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-3 block">Or Upload Video File</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition cursor-pointer">
                  <input type="file" onChange={handleFileSelect} className="hidden" id="video-input" accept="video/*" />
                  <label htmlFor="video-input" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">{file ? file.name : 'Click to upload video'}</p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Card className="p-4 bg-blue-50">
              <div className="flex items-center gap-3">
                <Loader className="w-4 h-4 animate-spin text-blue-600" />
                <div className="flex-1">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
                <span className="text-sm text-slate-600">{uploadProgress}%</span>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createProofMutation.isPending || uploadFileMutation.isPending || !formData.name || !formData.formal_name}>
              {createProofMutation.isPending ? 'Creating...' : 'Create Proof'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}