import React, { useMemo, useState } from 'react';
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
import { X, Upload, Link2, Link as LinkIcon } from 'lucide-react';
import DropboxFilePickerModal from '@/components/proofVault/DropboxFilePickerModal';
import PartyMultiSelectField from '@/components/proofVault/PartyMultiSelectField.jsx';

function OptionCard({ active, onClick, title, subtitle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border p-3 text-left transition ${
        active
          ? 'border-blue-600 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </button>
  );
}

function normalizePartyIds(currentProof) {
  if (Array.isArray(currentProof?.party_ids) && currentProof.party_ids.length > 0) {
    return currentProof.party_ids.filter(Boolean);
  }

  return currentProof?.party_id ? [currentProof.party_id] : [];
}

export default function ProofForm({ proof, onSubmit, onCancel }) {
  const initialSourceType = proof?.file_source === 'dropbox'
    ? 'dropbox'
    : (proof?.file_type === 'Video' && proof?.video_url && !proof?.file_url ? 'url' : 'upload');

  const [proofCategory, setProofCategory] = useState(proof?.proof_category || 'Exhibit');
  const [fileType, setFileType] = useState(proof?.file_type || 'PDF');
  const [sourceType, setSourceType] = useState(initialSourceType);
  const [formData, setFormData] = useState({
    ...proof,
    proof_category: proof?.proof_category || 'Exhibit',
    file_type: proof?.file_type || 'PDF',
    proof_child_type: proof?.proof_child_type ?? null,
    status: proof?.status || 'Draft',
    name: proof?.name || '',
    formal_name: proof?.formal_name || '',
    description: proof?.description || '',
    party_id: proof?.party_id || '',
    party_ids: normalizePartyIds(proof),
    category_id: proof?.category_id || '',
    proof_type_category_id: proof?.proof_type_category_id || '',
    file_url: proof?.file_url || '',
    video_url: proof?.video_url || '',
    file_source: proof?.file_source || 'base44',
    dropbox_file_id: proof?.dropbox_file_id || '',
    dropbox_path: proof?.dropbox_path || '',
    dropbox_file_name: proof?.dropbox_file_name || '',
    draft_exhibit_num: proof?.draft_exhibit_num || '',
  });
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDropboxPicker, setShowDropboxPicker] = useState(false);
  const [selectedDropboxFile, setSelectedDropboxFile] = useState(
    proof?.file_source === 'dropbox'
      ? {
          id: proof.dropbox_file_id,
          path_display: proof.dropbox_path,
          name: proof.dropbox_file_name || proof.name,
        }
      : null
  );

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

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
    enabled: !!proof?.id,
  });

  const childProofCount = useMemo(
    () => (proof?.id ? proofs.filter((item) => item.parent_proof_id === proof.id).length : 0),
    [proof?.id, proofs]
  );

  const fileSourceLocked = Boolean(proof?.id && childProofCount > 0);
  const dropboxFileName = selectedDropboxFile?.name || formData.dropbox_file_name || '';
  const sourceOptions = fileType === 'Video'
    ? [
        { value: 'upload', title: 'Upload', subtitle: 'Save video in the app' },
        { value: 'dropbox', title: 'Dropbox file', subtitle: 'Link a Dropbox video' },
        { value: 'url', title: 'Video URL', subtitle: 'Paste a direct video link' },
      ]
    : [
        { value: 'upload', title: 'Upload to app', subtitle: 'Store the file in the app' },
        { value: 'dropbox', title: 'Link Dropbox file', subtitle: 'Use a Dropbox file instead' },
      ];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const fileUrl = isPdf
        ? (await base44.functions.invoke('ensureSearchablePdf', { file })).data.file_url
        : (await base44.integrations.Core.UploadFile({ file })).file_url;

      setUploadedFileName(file.name);
      setSelectedDropboxFile(null);
      setSourceType('upload');
      setFormData((current) => ({
        ...current,
        file_source: 'base44',
        file_url: fileUrl,
        dropbox_file_id: '',
        dropbox_path: '',
        dropbox_file_name: '',
      }));
    } catch (error) {
      alert('File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProofCategoryChange = (newCategory) => {
    setProofCategory(newCategory);
    setFormData((current) => ({
      ...current,
      proof_category: newCategory,
      file_type: newCategory === 'Deposition' && current.file_type === 'Image' ? 'PDF' : current.file_type,
    }));
    if (newCategory === 'Deposition' && fileType === 'Image') {
      setFileType('PDF');
    }
  };

  const handleFileTypeChange = (newType) => {
    setFileType(newType);
    setFormData((current) => ({ ...current, file_type: newType }));
    if (newType !== 'Video' && sourceType === 'url') {
      setSourceType('upload');
    }
  };

  const handleSourceTypeChange = (nextSourceType) => {
    if (fileSourceLocked) return;

    setSourceType(nextSourceType);

    if (nextSourceType === 'upload') {
      setSelectedDropboxFile(null);
      setFormData((current) => ({
        ...current,
        file_source: 'base44',
        dropbox_file_id: '',
        dropbox_path: '',
        dropbox_file_name: '',
      }));
      return;
    }

    if (nextSourceType === 'dropbox') {
      setUploadedFileName(null);
      setFormData((current) => ({ ...current, file_url: '' }));
      return;
    }

    setSelectedDropboxFile(null);
    setUploadedFileName(null);
    setFormData((current) => ({
      ...current,
      file_url: '',
      dropbox_file_id: '',
      dropbox_path: '',
      dropbox_file_name: '',
      file_source: 'base44',
    }));
  };

  const handleSelectDropboxFile = (file) => {
    setSelectedDropboxFile(file);
    setUploadedFileName(null);
    setSourceType('dropbox');
    setFormData((current) => {
      const shouldSyncInternalName = !current.name?.trim() || current.name === current.dropbox_file_name;
      return {
        ...current,
        name: shouldSyncInternalName ? file.name : current.name,
        file_source: 'dropbox',
        file_url: '',
        dropbox_file_id: file.id,
        dropbox_path: file.path_display,
        dropbox_file_name: file.name,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Internal Name is required.');
      return;
    }

    if (!formData.proof_type_category_id) {
      alert('Proof Type is required.');
      return;
    }

    const selectedPartyIds = (formData.party_ids || []).filter(Boolean);

    if (selectedPartyIds.length === 0) {
      alert('At least one party is required.');
      return;
    }

    let nextPayload = {
      ...formData,
      proof_category: proofCategory,
      file_type: fileType,
      name: formData.name.trim(),
      formal_name: formData.formal_name.trim(),
      description: formData.description?.trim() || '',
      video_url: sourceType === 'url' ? formData.video_url.trim() : '',
      party_id: selectedPartyIds[0] || '',
      party_ids: selectedPartyIds,
    };

    if (sourceType === 'dropbox') {
      const dropboxSelection = selectedDropboxFile || (proof?.file_source === 'dropbox'
        ? {
            id: proof.dropbox_file_id,
            path_display: proof.dropbox_path,
            name: proof.dropbox_file_name || proof.name,
          }
        : null);

      if (!dropboxSelection) {
        alert('Select a Dropbox file first.');
        return;
      }

      const fileChanged = !proof || proof.file_source !== 'dropbox' || proof.dropbox_file_id !== dropboxSelection.id || proof.dropbox_path !== dropboxSelection.path_display;

      if (fileChanged && fileType === 'PDF') {
        const response = await base44.functions.invoke('prepareDropboxProof', {
          fileId: dropboxSelection.id,
          path: dropboxSelection.path_display,
          name: dropboxSelection.name,
        });

        nextPayload = {
          ...nextPayload,
          ...response.data,
          file_url: '',
          video_url: '',
        };
      } else {
        nextPayload = {
          ...nextPayload,
          file_source: 'dropbox',
          dropbox_file_id: dropboxSelection.id,
          dropbox_path: dropboxSelection.path_display,
          dropbox_file_name: dropboxSelection.name,
          file_url: '',
          video_url: '',
        };
      }
    } else if (sourceType === 'upload') {
      nextPayload = {
        ...nextPayload,
        file_source: 'base44',
        dropbox_file_id: '',
        dropbox_path: '',
        dropbox_file_name: '',
      };
    } else {
      nextPayload = {
        ...nextPayload,
        file_source: 'base44',
        file_url: '',
        dropbox_file_id: '',
        dropbox_path: '',
        dropbox_file_name: '',
      };
    }

    const currentStatus = nextPayload.status || proof?.status || 'Draft';
    if (proofCategory === 'Exhibit' && currentStatus !== 'Draft' && !nextPayload.formal_name?.trim()) {
      alert('Formal Name is required once an exhibit leaves Draft.');
      return;
    }

    if (sourceType === 'upload' && !nextPayload.file_url) {
      alert(`${fileType} file is required.`);
      return;
    }

    if (sourceType === 'dropbox' && !nextPayload.dropbox_file_id && !nextPayload.dropbox_path) {
      alert('Dropbox file is required.');
      return;
    }

    if (sourceType === 'url' && fileType === 'Video' && !nextPayload.video_url) {
      alert('Video URL is required.');
      return;
    }

    onSubmit(nextPayload);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Proof Category</label>
            <div className="grid grid-cols-2 gap-3">
              <OptionCard
                active={proofCategory === 'Exhibit'}
                onClick={() => handleProofCategoryChange('Exhibit')}
                title="Exhibit"
                subtitle="Photos, PDFs, videos"
              />
              <OptionCard
                active={proofCategory === 'Deposition'}
                onClick={() => handleProofCategoryChange('Deposition')}
                title="Deposition"
                subtitle="PDF or video only"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">File Type</label>
            <div className="grid grid-cols-3 gap-3">
              <OptionCard active={fileType === 'PDF'} onClick={() => handleFileTypeChange('PDF')} title="PDF" subtitle="Documents" />
              <OptionCard
                active={fileType === 'Image'}
                onClick={() => handleFileTypeChange('Image')}
                title="Image"
                subtitle="Photos"
                disabled={proofCategory === 'Deposition'}
              />
              <OptionCard active={fileType === 'Video'} onClick={() => handleFileTypeChange('Video')} title="Video" subtitle="Media clips" />
            </div>
          </div>
        </div>

        <div className={sourceType === 'dropbox' ? 'grid gap-4 md:grid-cols-3' : 'grid gap-4 md:grid-cols-2'}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Name *</label>
            <div className="relative">
              <Input
                placeholder="e.g., Scene Photo 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={formData.name ? 'pr-10' : ''}
                required
              />
              {formData.name && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, name: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Clear internal name"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Formal Name</label>
            <Input
              placeholder="e.g., Photograph of Intersection"
              value={formData.formal_name}
              onChange={(e) => setFormData({ ...formData, formal_name: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">Required before an exhibit is moved out of Draft.</p>
          </div>
          {sourceType === 'dropbox' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Filename</label>
              <Input value={dropboxFileName} readOnly />
              <p className="text-xs text-slate-500 mt-1">Pulled directly from Dropbox.</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proof Type *</label>
            <Select value={formData.proof_type_category_id} onValueChange={(value) => setFormData({ ...formData, proof_type_category_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select proof type" />
              </SelectTrigger>
              <SelectContent>
                {proofTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PartyMultiSelectField
            label="Assign to Parties"
            required
            parties={parties}
            value={formData.party_ids || []}
            onChange={(partyIds) => setFormData({ ...formData, party_ids: partyIds, party_id: partyIds[0] || '' })}
            helperText="Select one or more parties for this proof."
          />

          {proofCategory === 'Exhibit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Draft Exhibit #</label>
              <Input
                placeholder="e.g., A-1"
                value={formData.draft_exhibit_num}
                onChange={(e) => setFormData({ ...formData, draft_exhibit_num: e.target.value })}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">File Source</label>
          <div className={`grid gap-3 ${fileType === 'Video' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {sourceOptions.map((option) => (
              <OptionCard
                key={option.value}
                active={sourceType === option.value}
                onClick={() => handleSourceTypeChange(option.value)}
                title={option.title}
                subtitle={option.subtitle}
                disabled={fileSourceLocked}
              />
            ))}
          </div>
          {fileSourceLocked && (
            <p className="text-xs text-amber-700 mt-2">
              File source is locked because this proof has {childProofCount} child proof{childProofCount === 1 ? '' : 's'}.
            </p>
          )}
        </div>

        {sourceType === 'upload' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Upload {fileType}</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 bg-slate-50">
              {uploadedFileName || formData.file_url ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700 truncate">{uploadedFileName || formData.file_url.split('/').pop()}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName(null);
                      setFormData({ ...formData, file_url: '' });
                    }}
                    className="text-red-600 hover:text-red-700 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer text-center">
                  <Upload className="w-7 h-7 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-700">Click to upload</span>
                  <span className="text-xs text-slate-500 mt-1">Stored in the app</span>
                  <input
                    type="file"
                    accept={fileType === 'PDF' ? '.pdf' : fileType === 'Image' ? 'image/*' : 'video/*'}
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {sourceType === 'dropbox' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Dropbox File</label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              {selectedDropboxFile ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">Source Filename</div>
                    <div className="text-sm font-medium text-slate-800 truncate">{selectedDropboxFile.name}</div>
                    <div className="text-xs text-slate-500 truncate">{selectedDropboxFile.path_display}</div>
                  </div>
                  {!fileSourceLocked && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowDropboxPicker(true)}>Change</Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedDropboxFile(null);
                          setFormData({
                            ...formData,
                            dropbox_file_id: '',
                            dropbox_path: '',
                            dropbox_file_name: '',
                          });
                        }}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => setShowDropboxPicker(true)} className="gap-2" disabled={fileSourceLocked}>
                  <Link2 className="w-4 h-4" /> Choose Dropbox File
                </Button>
              )}
              {fileType === 'PDF' && (
                <p className="text-xs text-slate-500 mt-2">Dropbox PDFs are OCR-checked automatically and saved back to the Dropbox folder set in Settings.</p>
              )}
            </div>
          </div>
        )}

        {sourceType === 'url' && fileType === 'Video' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Video URL</label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs">
                <LinkIcon className="w-3.5 h-3.5" /> Paste a direct video link
              </div>
              <Input
                placeholder="https://..."
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <Textarea
            placeholder="Additional details"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="h-20"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{proof ? 'Update Proof' : 'Save Proof'}</Button>
        </div>
      </form>

      <DropboxFilePickerModal
        open={showDropboxPicker}
        onClose={() => setShowDropboxPicker(false)}
        fileType={fileType}
        onSelect={handleSelectDropboxFile}
      />
    </>
  );
}