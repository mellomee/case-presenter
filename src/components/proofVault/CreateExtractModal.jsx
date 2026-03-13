import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';

export default function CreateExtractModal({ open, onClose, parentProof }) {
  const queryClient = useQueryClient();
  const [extractSource, setExtractSource] = useState('original');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pageRangeInput, setPageRangeInput] = useState('');
  const [internalName, setInternalName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState(null);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Validate inputs
      if (!internalName.trim()) throw new Error('Internal Name is required');
      if (!formalName.trim()) throw new Error('Formal Name is required');
      if (!pageRangeInput.trim()) throw new Error('Pages are required');

      const extractFileUrl = extractSource === 'original' ? parentProof.file_url : (uploadedFile?.url || parentProof.file_url);

      const extract = await base44.entities.Proof.create({
        proof_category: parentProof.proof_category,
        file_type: 'PDF',
        proof_child_type: 'Extract',
        name: internalName.trim(),
        formal_name: formalName.trim(),
        parent_proof_id: parentProof.id,
        party_id: parentProof.party_id,
        status: 'Draft',
        category_id: parentProof.category_id,
        file_url: extractFileUrl,
        draft_exhibit_num: draftExhibitNum.trim() || null,
        extract_pages: pageRangeInput.trim(),
      });

      return extract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      resetForm();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({ url: res.file_url, name: file.name });
      setError('');
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setExtractSource('original');
    setUploadedFile(null);
    setPageRangeInput('');
    setInternalName('');
    setFormalName('');
    setDraftExhibitNum('');
    setError('');
    setNumPages(null);
  };

  const handleSave = () => {
    setError('');
    createMutation.mutate();
  };

  // Auto-fill page range when switching to original
  React.useEffect(() => {
    if (extractSource === 'original' && numPages && !pageRangeInput) {
      setPageRangeInput(`1-${numPages}`);
    }
  }, [extractSource, numPages, pageRangeInput]);

  if (!parentProof) return null;

  const hasError = !parentProof.file_url && extractSource === 'original';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Extract</DialogTitle>
        </DialogHeader>

        {/* Parent Proof Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-sm text-blue-900">
            <strong>From:</strong> {parentProof.formal_name}
            {parentProof.proof_category === 'Deposition' && (
              <span className="ml-2 inline-block bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">
                Deposition
              </span>
            )}
            {parentProof.proof_category === 'Exhibit' && (
              <span className="ml-2 inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                Exhibit
              </span>
            )}
          </p>
        </div>

        {/* Pre-condition check */}
        {hasError && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">
              Please upload a PDF file to the parent proof before creating an Extract.
              <Button
                variant="link"
                size="sm"
                className="text-red-600 underline h-auto p-0 ml-2"
                onClick={() => {
                  onClose();
                  // Parent should handle opening Edit modal
                }}
              >
                Edit Proof
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Extract Source Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Extract Source</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="source"
                value="original"
                checked={extractSource === 'original'}
                onChange={(e) => setExtractSource(e.target.value)}
                disabled={hasError}
              />
              <span className="text-sm">Use Original PDF</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="source"
                value="upload"
                checked={extractSource === 'upload'}
                onChange={(e) => setExtractSource(e.target.value)}
              />
              <span className="text-sm">Upload New Snippet</span>
            </label>
          </div>
        </div>

        {/* PDF Viewer */}
        {!hasError && parentProof.file_url && (
          <div className="mb-4 border border-slate-200 rounded-md overflow-hidden bg-slate-900" style={{ height: '300px' }}>
            <PDFViewer
              fileUrl={parentProof.file_url}
              mode="viewer"
              onLoadSuccess={(doc) => setNumPages(doc.numPages)}
            />
          </div>
        )}

        {/* Upload New Snippet Section */}
        {extractSource === 'upload' && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Shortened PDF</label>
            <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center hover:border-slate-400 transition cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {uploading ? 'Uploading...' : 'Click to upload PDF'}
                </span>
              </label>
            </div>
            {uploadedFile && (
              <p className="text-xs text-slate-600 mt-2">
                ✓ {uploadedFile.name}
              </p>
            )}
          </div>
        )}

        {/* Page Range Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pages from Original PDF <span className="text-red-600">*</span>
          </label>
          <Input
            placeholder="e.g. 1-3, 5, 13-18"
            value={pageRangeInput}
            onChange={(e) => setPageRangeInput(e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Format: 1-3, 5, 13-18</p>
        </div>

        {/* Metadata Fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Internal Name <span className="text-red-600">*</span>
            </label>
            <Input
              placeholder="e.g. Scene Photo Extract"
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Formal Name <span className="text-red-600">*</span>
            </label>
            <Input
              placeholder="e.g. Pages 1-3 of Scene Photos"
              value={formalName}
              onChange={(e) => setFormalName(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Draft Exhibit # (optional)
          </label>
          <Input
            placeholder="e.g. A-5"
            value={draftExhibitNum}
            onChange={(e) => setDraftExhibitNum(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Error Message */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mt-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || uploading || hasError}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createMutation.isPending ? 'Creating...' : 'Save Extract'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}