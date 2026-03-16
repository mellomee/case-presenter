import React, { useState } from 'react';
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
import { X, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProofForm({ proof, onSubmit, onCancel }) {
  const [proofCategory, setProofCategory] = useState(proof?.proof_category || 'Exhibit');
  const [fileType, setFileType] = useState(proof?.file_type || 'PDF');
  const [formData, setFormData] = useState(
    proof || {
      proof_category: 'Exhibit',
      file_type: 'PDF',
      proof_child_type: null,
      name: '',
      formal_name: '',
      description: '',
      party_id: '',
      category_id: '',
      proof_type_category_id: '',
      file_url: '',
      video_url: '',
      draft_exhibit_num: '',
    }
  );
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(null); // null | 'checking' | 'processing' | 'done'

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setOcrStatus(null);
    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      let finalUrl = uploadResponse.file_url;
      setUploadedFileName(file.name);

      // For PDFs, check and apply OCR if needed
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setOcrStatus('checking');
        const ocrResponse = await base44.functions.invoke('ocrPdf', { file_url: finalUrl });
        finalUrl = ocrResponse.data.file_url;
        setOcrStatus(ocrResponse.data.ocr_applied ? 'processing' : 'done');
        setTimeout(() => setOcrStatus('done'), 1000);
      }

      setFormData((prev) => ({ ...prev, file_url: finalUrl }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('File upload failed. Please try again.');
      setOcrStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProofCategoryChange = (newCategory) => {
    setProofCategory(newCategory);
    setFormData({
      ...formData,
      proof_category: newCategory,
      party_id: newCategory === 'Deposition' ? formData.party_id : '',
    });
  };

  const handleFileTypeChange = (newType) => {
    setFileType(newType);
    setFormData({ ...formData, file_type: newType });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.formal_name) {
      alert('Internal Name and Formal Name are required.');
      return;
    }

    if (!formData.proof_type_category_id) {
      alert('Proof Type is required.');
      return;
    }

    if (proofCategory === 'Deposition' && !formData.party_id) {
      alert('Party is required for Depositions.');
      return;
    }

    if (fileType === 'PDF' && !formData.file_url && !proof) {
      alert('PDF file is required.');
      return;
    }

    if (fileType === 'Image' && !formData.file_url && !proof) {
      alert('Image file is required.');
      return;
    }

    if (fileType === 'Video' && !formData.video_url && !formData.file_url && !proof) {
      alert('Video URL or file is required.');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto pr-2">
      {/* Proof Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Proof Category</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={proofCategory === 'Exhibit'}
              onChange={() => handleProofCategoryChange('Exhibit')}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">Exhibit</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={proofCategory === 'Deposition'}
              onChange={() => handleProofCategoryChange('Deposition')}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">Deposition</span>
          </label>
        </div>
      </div>

      {/* File Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">File Type</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={fileType === 'PDF'}
              onChange={() => handleFileTypeChange('PDF')}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">PDF</span>
          </label>
          <label
            className={`flex items-center gap-2 cursor-pointer ${
              proofCategory === 'Deposition' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input
              type="radio"
              checked={fileType === 'Image'}
              onChange={() => handleFileTypeChange('Image')}
              disabled={proofCategory === 'Deposition'}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">Image</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={fileType === 'Video'}
              onChange={() => handleFileTypeChange('Video')}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">Video</span>
          </label>
        </div>
      </div>

      {/* Internal Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Internal Name *
        </label>
        <Input
          placeholder="e.g., Scene Photo 1"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      {/* Formal Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Formal Name *
        </label>
        <Input
          placeholder="e.g., Photograph of Intersection"
          value={formData.formal_name}
          onChange={(e) => setFormData({ ...formData, formal_name: e.target.value })}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description (optional)
        </label>
        <Textarea
          placeholder="Additional details"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="h-16"
        />
      </div>

      {/* Party (Mandatory for Deposition) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Assign to Party {proofCategory === 'Deposition' && '*'}
        </label>
        <Select
          value={formData.party_id}
          onValueChange={(value) => setFormData({ ...formData, party_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select party (optional)" />
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

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Category (optional)
        </label>
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

      {/* Proof Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Proof Type *
        </label>
        <Select
          value={formData.proof_type_category_id}
          onValueChange={(value) => setFormData({ ...formData, proof_type_category_id: value })}
        >
          <SelectTrigger>
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

      {/* Draft Exhibit # (Exhibit only) */}
      {proofCategory === 'Exhibit' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Draft Exhibit # (optional)
          </label>
          <Input
            placeholder="e.g., A-1"
            value={formData.draft_exhibit_num}
            onChange={(e) => setFormData({ ...formData, draft_exhibit_num: e.target.value })}
          />
        </div>
      )}

      {/* PDF Upload */}
      {fileType === 'PDF' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload PDF {!proof && '*'}
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
            {uploadedFileName || formData.file_url ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">
                    {uploadedFileName || formData.file_url.split('/').pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName(null);
                      setOcrStatus(null);
                      setFormData({ ...formData, file_url: '' });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {ocrStatus === 'checking' && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking for searchable text…
                  </div>
                )}
                {ocrStatus === 'processing' && (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running OCR to make PDF searchable…
                  </div>
                )}
                {ocrStatus === 'done' && (
                  <div className="text-xs text-green-600">PDF is searchable ✓</div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-slate-400 mb-2 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {isUploading ? 'Uploading…' : 'Click to upload or drag & drop'}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Image Upload */}
      {fileType === 'Image' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload Image {!proof && '*'}
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
            {uploadedFileName || formData.file_url ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  {uploadedFileName || formData.file_url.split('/').pop()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFileName(null);
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
                <span className="text-sm font-medium text-slate-700">
                  Click to upload or drag & drop
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Video */}
      {fileType === 'Video' && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Video URL (YouTube, Dropbox, etc.)
            </label>
            <Input
              placeholder="https://..."
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              or Upload Video File (optional)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
              {uploadedFileName || formData.file_url ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">
                    {uploadedFileName || formData.file_url.split('/').pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName(null);
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
                  <span className="text-sm font-medium text-slate-700">
                    Click to upload
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {proof ? 'Update Proof' : 'Save Proof'}
        </Button>
      </div>
    </form>
  );
}