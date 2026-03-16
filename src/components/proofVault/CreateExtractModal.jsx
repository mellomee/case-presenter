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
import { AlertCircle, Download, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';
import { formatPageSelection, parsePageSelection } from '@/lib/proofPdfUtils';

export default function CreateExtractModal({ open, onClose, parentProof, onWarning, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = parentProof?.proof_child_type === 'Extract';
  const [extractSource, setExtractSource] = useState('original');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savingExtract, setSavingExtract] = useState(false);
  const [pageRange, setPageRange] = useState('');
  const [selectedPages, setSelectedPages] = useState([]);
  const [sourceTotalPages, setSourceTotalPages] = useState(0);
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
    setUploadingFile(false);
    setSavingExtract(false);
    setPageRange('');
    setSelectedPages([]);
    setSourceTotalPages(0);
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

  const childClips = isEditing
    ? proofs.filter((proof) => proof.parent_proof_id === parentProof?.id && proof.proof_child_type === 'ExtractClip')
    : [];

  const canChangeExtractSource = !isEditing || childClips.length === 0;
  const selectedPagesLabel = formatPageSelection(selectedPages);

  useEffect(() => {
    if (!open || !parentProof) return;

    if (isEditing) {
      setExtractSource('original');
      setUploadedFile(null);
      setPageRange(parentProof.extract_pages || '');
      setSelectedPages(parsePageSelection(parentProof.extract_pages || ''));
      setInternalName(parentProof.name || '');
      setFormalName(parentProof.formal_name || '');
      setDraftExhibitNum(parentProof.draft_exhibit_num || '');
      setPageRangeError('');
      setWarningMsg('');
      setShowWarning(false);
      return;
    }

    resetForm();
  }, [open, parentProof, isEditing]);

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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.functions.invoke('ensureSearchablePdf', { file });
      setUploadedFile(response.data.file_url);
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

    if (extractSource === 'original' && selectedPages.length === 0) {
      setWarningMsg('Select at least one page from the thumbnail strip.');
      setShowWarning(true);
      return;
    }

    if (extractSource === 'original' && !sourceTotalPages) {
      setWarningMsg('Wait for the PDF to finish loading before saving the extract.');
      setShowWarning(true);
      return;
    }

    if (extractSource === 'upload' && !uploadedFile) {
      setWarningMsg('Upload a PDF snippet first.');
      setShowWarning(true);
      return;
    }

    if (extractSource === 'upload' && !validatePageRange(pageRange)) {
      return;
    }

    let extractedFileUrl = extractSource === 'upload' ? uploadedFile : null;
    let extractPagesValue = extractSource === 'upload' ? pageRange.trim() : selectedPagesLabel;
    let dropboxFileId = null;
    let dropboxFilePath = null;

    if (extractSource === 'original') {
      setSavingExtract(true);
      try {
        const response = await base44.functions.invoke('extractPdfPages', {
          sourceFileUrl: actualParentProof.file_url,
          selectedPages,
          totalPages: sourceTotalPages,
          fileName: formalName.trim() || internalName.trim(),
        });

        extractedFileUrl = response.data.file_url;
        extractPagesValue = response.data.extract_pages || selectedPagesLabel;
        dropboxFileId = response.data.dropbox_file_id || null;
        dropboxFilePath = response.data.dropbox_file_path || null;
      } catch (error) {
        setWarningMsg(error.message || 'Unable to create extract from selected pages.');
        setShowWarning(true);
        setSavingExtract(false);
        return;
      }
      setSavingExtract(false);
    }

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
      file_url: extractedFileUrl,
      extract_pages: extractPagesValue,
      draft_exhibit_num: draftExhibitNum.trim() || null,
      dropbox_file_id: dropboxFileId,
      dropbox_file_path: dropboxFilePath,
    };

    saveMutation.mutate(extractData);
  };

  if (!parentProof || !actualParentProof) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Extract' : 'Create Extract'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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

          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">Extract Source</label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="extractSource"
                  value="original"
                  checked={extractSource === 'original'}
                  onChange={(event) => setExtractSource(event.target.value)}
                  disabled={!canChangeExtractSource}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Select Pages from Original PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="extractSource"
                  value="upload"
                  checked={extractSource === 'upload'}
                  onChange={(event) => setExtractSource(event.target.value)}
                  disabled={!canChangeExtractSource}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Upload New Snippet</span>
              </label>
            </div>
            {!canChangeExtractSource && (
              <p className="text-xs text-amber-700 mt-2">
                Extract source is locked because this extract already has child clips attached.
              </p>
            )}
          </div>

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
                {uploadedFile && <p className="text-xs text-green-600 mt-2">✓ File uploaded</p>}
              </div>
            </div>
          )}

          {(extractSource === 'original' ? actualParentProof.file_url : uploadedFile) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="text-sm font-medium text-slate-700">PDF Preview</label>
                {extractSource === 'original' && (
                  <div className="text-xs text-slate-600">
                    {selectedPages.length > 0
                      ? `Selected pages: ${selectedPagesLabel}`
                      : 'Click thumbnails to choose pages. Use Ctrl/Cmd or Shift for multi-select.'}
                  </div>
                )}
              </div>
              <div className="bg-slate-900 rounded-lg overflow-hidden h-[30rem] border border-slate-200">
                <PDFViewer
                  fileUrl={extractSource === 'original' ? actualParentProof.file_url : uploadedFile}
                  mode="viewer"
                  allowPageSelection={extractSource === 'original'}
                  selectedPages={selectedPages}
                  onSelectedPagesChange={setSelectedPages}
                  onDocumentLoad={({ numPages }) => setSourceTotalPages(numPages)}
                />
              </div>
            </div>
          )}

          {extractSource === 'upload' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Pages from Original PDF (required)</label>
              <Input
                placeholder="e.g. 1-3, 5, 13-18"
                value={pageRange}
                onChange={(event) => {
                  setPageRange(event.target.value);
                  if (pageRangeError) setPageRangeError('');
                }}
                className={pageRangeError ? 'border-red-500' : ''}
              />
              {pageRangeError && <p className="text-xs text-red-600 mt-1">{pageRangeError}</p>}
              <p className="text-xs text-slate-500 mt-1">Format: 1-3, 5, 13-18 (comma-separated ranges or single pages)</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Internal Name *</label>
              <Input
                placeholder="e.g. Scene Photo Extract - Pages 1-3"
                value={internalName}
                onChange={(event) => setInternalName(event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Formal Name *</label>
              <Input
                placeholder="e.g. Photograph Pages 1-3"
                value={formalName}
                onChange={(event) => setFormalName(event.target.value)}
              />
            </div>
          </div>

          {parentProof.proof_category === 'Exhibit' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Draft Exhibit # (optional)</label>
              <Input
                placeholder="e.g. A-1a"
                value={draftExhibitNum}
                onChange={(event) => setDraftExhibitNum(event.target.value)}
              />
            </div>
          )}

          <div className="flex gap-3 justify-between pt-4 border-t border-slate-200 flex-wrap">
            <div>
              {isEditing && parentProof.file_url && (
                <a href={parentProof.file_url} download>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Current Extract
                  </Button>
                </a>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending || savingExtract}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveMutation.isPending || savingExtract
                  ? (isEditing ? 'Saving...' : 'Creating...')
                  : (isEditing ? 'Save Changes' : 'Save Extract')}
              </Button>
            </div>
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