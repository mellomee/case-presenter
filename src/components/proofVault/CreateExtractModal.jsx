import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Upload, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';

export default function CreateExtractModal({ open, onClose, parentProof, onWarning, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = parentProof?.proof_child_type === 'Extract';
  const [extractSource, setExtractSource] = useState('original');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pageRange, setPageRange] = useState('');
  const [internalName, setInternalName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [pageRangeError, setPageRangeError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        return base44.entities.Proof.update(parentProof.id, data);
      }
      return base44.entities.Proof.create(data);
    },
    onSuccess: (savedProof) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      onSuccess?.(savedProof);
      resetForm();
      onClose();
    },
    onError: (error) => {
      setWarningMsg(`Error ${isEditing ? 'saving' : 'creating'} extract: ${error.message}`);
      setShowWarning(true);
    },
  });

  const resetForm = () => {
    setExtractSource('original');
    setUploadedFile(null);
    setPageRange('');
    setInternalName('');
    setFormalName('');
    setDraftExhibitNum('');
    setPageRangeError('');
    setWarningMsg('');
    setShowWarning(false);
  };

  const actualParentProof = isEditing
    ? proofs.find((proof) => proof.id === parentProof?.parent_proof_id) || parentProof
    : parentProof;

  const hasChildClips = isEditing && proofs.some(
    (proof) => proof.parent_proof_id === parentProof?.id && proof.proof_child_type === 'ExtractClip'
  );

  useEffect(() => {
    if (!open || !parentProof) return;

    if (isEditing) {
      const usingOriginal = parentProof.file_url === actualParentProof?.file_url;
      setExtractSource(usingOriginal ? 'original' : 'upload');
      setUploadedFile(usingOriginal ? null : parentProof.file_url || null);
      setPageRange(parentProof.extract_pages || '');
      setInternalName(parentProof.name || '');
      setFormalName(parentProof.formal_name || '');
      setDraftExhibitNum(parentProof.draft_exhibit_num || '');
      setPageRangeError('');
      setWarningMsg('');
      setShowWarning(false);
      return;
    }

    resetForm();
  }, [open, parentProof, isEditing, actualParentProof]);

  // Validate page range format (e.g. "1-3, 5, 13-18")
  const validatePageRange = (range) => {
    if (!range.trim()) {
      setPageRangeError('Page range is required');
      return false;
    }
    const pattern = /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/;
    if (!pattern.test(range.trim())) {
      setPageRangeError('Invalid format. Use: 1-3, 5, 13-18');
      return false;
    }
    setPageRangeError('');
    return true;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(response.file_url);
      setPageRangeError('');
    } catch (error) {
      setWarningMsg(`File upload failed: ${error.message}`);
      setShowWarning(true);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async () => {
    if (!internalName.trim()) {
      setWarningMsg('Internal Name is required');
      setShowWarning(true);
      return;
    }
    if (!formalName.trim()) {
      setWarningMsg('Formal Name is required');
      setShowWarning(true);
      return;
    }
    if (extractSource === 'upload' && !validatePageRange(pageRange)) {
      return;
    }

    const fileUrl = extractSource === 'original' ? actualParentProof.file_url : uploadedFile;

    const extractData = {
      proof_category: parentProof.proof_category,
      file_type: 'PDF',
      proof_child_type: 'Extract',
      name: internalName.trim(),
      formal_name: formalName.trim(),
      parent_proof_id: isEditing ? parentProof.parent_proof_id : parentProof.id,
      party_id: parentProof.party_id || null,
      status: parentProof.status === 'Draft' ? 'Draft' : parentProof.status,
      category_id: parentProof.category_id || null,
      proof_type_category_id: parentProof.proof_type_category_id,
      file_url: fileUrl,
      extract_pages: pageRange.trim(),
      draft_exhibit_num: draftExhibitNum.trim() || null,
    };

    saveMutation.mutate(extractData);
  };

  if (!parentProof) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Extract' : 'Create Extract'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Parent info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {isEditing ? `Editing: ${parentProof.formal_name || parentProof.name}` : `From: ${parentProof.formal_name}`}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {actualParentProof.proof_category === 'Exhibit' ? 'Exhibit' : 'Deposition'} · {actualParentProof.file_type}
              </p>
            </div>
          </div>

          {/* Extract source selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">Extract Source</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="extractSource"
                  value="original"
                  checked={extractSource === 'original'}
                  onChange={(e) => setExtractSource(e.target.value)}
                  disabled={isEditing && hasChildClips}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Use Original PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="extractSource"
                  value="upload"
                  checked={extractSource === 'upload'}
                  onChange={(e) => setExtractSource(e.target.value)}
                  disabled={isEditing && hasChildClips}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Upload New Snippet</span>
              </label>
            </div>
          </div>

          {/* Conditional upload section */}
          {extractSource === 'upload' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Upload Shortened PDF</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-2">Click to upload or drag & drop</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                  id="extractFileUpload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('extractFileUpload').click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? 'Uploading...' : 'Select PDF'}
                </Button>
                {uploadedFile && (
                  <p className="text-xs text-green-600 mt-2">✓ File uploaded</p>
                )}
              </div>
            </div>
          )}

          {/* PDF viewer for page selection */}
          {(extractSource === 'original' ? actualParentProof.file_url : uploadedFile) && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">PDF Preview</label>
              <div className="bg-slate-900 rounded-lg overflow-hidden h-64 border border-slate-200">
                <PDFViewer
                  fileUrl={extractSource === 'original' ? actualParentProof.file_url : uploadedFile}
                  mode="viewer"
                />
              </div>
            </div>
          )}

          {/* Page range input - only for upload */}
          {extractSource === 'upload' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Pages from Original PDF (required)
              </label>
              <Input
                placeholder="e.g. 1-3, 5, 13-18"
                value={pageRange}
                onChange={(e) => {
                  setPageRange(e.target.value);
                  if (pageRangeError) setPageRangeError('');
                }}
                className={pageRangeError ? 'border-red-500' : ''}
              />
              {pageRangeError && (
                <p className="text-xs text-red-600 mt-1">{pageRangeError}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Format: 1-3, 5, 13-18 (comma-separated ranges or single pages)</p>
            </div>
          )}

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Internal Name *</label>
              <Input
                placeholder="e.g. Scene Photo Extract - Pages 1-3"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Formal Name *</label>
              <Input
                placeholder="e.g. Photograph Pages 1-3"
                value={formalName}
                onChange={(e) => setFormalName(e.target.value)}
              />
            </div>
          </div>

          {/* Draft exhibit number */}
          {parentProof.proof_category === 'Exhibit' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Draft Exhibit # (optional)
              </label>
              <Input
                placeholder="e.g. A-1a"
                value={draftExhibitNum}
                onChange={(e) => setDraftExhibitNum(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Save Extract')}
            </Button>
          </div>
        </div>

        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">
                {warningMsg}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}