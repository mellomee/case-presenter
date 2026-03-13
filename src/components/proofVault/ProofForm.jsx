import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload } from 'lucide-react';

export default function ProofForm({ open, onOpenChange }) {
  const [category, setCategory] = useState('Exhibit');
  const [fileType, setFileType] = useState('PDF');
  const [name, setName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [description, setDescription] = useState('');
  const [partyId, setPartyId] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const queryClient = useQueryClient();

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list().catch(() => []),
  });

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

  const resetForm = () => {
    setCategory('Exhibit');
    setFileType('PDF');
    setName('');
    setFormalName('');
    setDescription('');
    setPartyId('');
    setDraftExhibitNum('');
    setFile(null);
    setVideoUrl('');
    setUploadProgress(0);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!name || !formalName) {
      alert('Please enter name and formal name');
      return;
    }

    if (fileType !== 'Video' && !file) {
      alert('Please select a file');
      return;
    }

    if (fileType === 'Video' && !file && !videoUrl) {
      alert('Please upload a video or enter a video URL');
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;
      let uploadedVideoUrl = null;

      if (file) {
        const uploadRes = await base44.integrations.Core.UploadFile({ file });
        fileUrl = uploadRes.file_url;
        if (fileType === 'Video') {
          uploadedVideoUrl = fileUrl;
        }
      }

      const proofData = {
        proof_category: category,
        file_type: fileType,
        name,
        formal_name: formalName,
        description: description || undefined,
        party_id: partyId || undefined,
        status: 'Draft',
      };

      if (fileType === 'PDF' || fileType === 'Image') {
        proofData.file_url = fileUrl;
      }

      if (fileType === 'Video') {
        proofData.video_url = uploadedVideoUrl || videoUrl;
      }

      if (category === 'Exhibit' && draftExhibitNum) {
        proofData.draft_exhibit_num = draftExhibitNum;
      }

      await createProofMutation.mutateAsync(proofData);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const isExhibit = category === 'Exhibit';
  const isVideo = fileType === 'Video';
  const allowedFileTypes = isExhibit
    ? ['PDF', 'Image', 'Video']
    : ['PDF', 'Video'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Proof</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Proof Category</label>
            <div className="flex gap-4">
              {['Exhibit', 'Deposition'].map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={category === cat}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setFileType(e.target.value === 'Deposition' ? 'PDF' : 'PDF');
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* File Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">File Type</label>
            <div className="flex gap-4">
              {allowedFileTypes.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fileType"
                    value={type}
                    checked={fileType === type}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name*</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Internal name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Formal Name*</label>
              <Input
                value={formalName}
                onChange={(e) => setFormalName(e.target.value)}
                placeholder="Display name"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Party Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Associated Party</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="">Select a party (optional)</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.first_name} {party.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Exhibit Number (for Exhibits only) */}
          {isExhibit && (
            <div>
              <label className="block text-sm font-medium mb-1">Draft Exhibit Number</label>
              <Input
                value={draftExhibitNum}
                onChange={(e) => setDraftExhibitNum(e.target.value)}
                placeholder="Optional (e.g., 1, 2A)"
              />
            </div>
          )}

          {/* File Upload */}
          {isVideo ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Upload Video or Enter URL</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Upload File</label>
                    <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 transition-colors block">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {file ? file.name : 'Click to upload video'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  <div className="text-center text-xs text-slate-500">OR</div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Video URL</label>
                    <Input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      disabled={uploading}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Upload {fileType}</label>
              <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 transition-colors block">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {file ? file.name : `Click to upload ${fileType}`}
                  </span>
                </div>
                <input
                  type="file"
                  accept={fileType === 'PDF' ? '.pdf' : 'image/*'}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-full">
                  <div className="text-sm font-medium mb-2">Uploading...</div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Create Proof'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}