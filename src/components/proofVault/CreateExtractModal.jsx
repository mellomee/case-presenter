import React, { useEffect, useMemo, useState } from 'react';
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
import { AlertCircle, Upload, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';
import { compressPageRange, parsePageRange } from './pageRangeUtils';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import PartyMultiSelectField from '@/components/proofVault/PartyMultiSelectField.jsx';
import { buildProcessDropboxPdfPayload, isOptimizableDropboxPdf, processDropboxPdf } from '@/lib/dropboxPdfProcessing';

function normalizePartyIds(currentProof) {
  const raw = currentProof?.party_ids;
  // Handle { ids: [...] } format
  if (raw && !Array.isArray(raw) && Array.isArray(raw.ids)) {
    return raw.ids.filter(Boolean);
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter(Boolean);
  }
  return currentProof?.party_id ? [currentProof.party_id] : [];
}

export default function CreateExtractModal({ open, onClose, parentProof, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = parentProof?.proof_child_type === 'Extract';
  const [extractSource, setExtractSource] = useState('original');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pageRange, setPageRange] = useState('');
  const [selectedOriginalPages, setSelectedOriginalPages] = useState([]);
  const [internalName, setInternalName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [pageRangeError, setPageRangeError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [selectedPartyIds, setSelectedPartyIds] = useState([]);
  const [proofTypeId, setProofTypeId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [addCoverPage, setAddCoverPage] = useState(true);
  const [addPageNumbers, setAddPageNumbers] = useState(true);
  const [optimizePdf, setOptimizePdf] = useState(true);
  const [applyOcr, setApplyOcr] = useState(true);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const actualParentProof = isEditing
    ? proofs.find((proof) => proof.id === parentProof?.parent_proof_id) || parentProof
    : parentProof;

  const { url: resolvedParentUrl, isLoading: isResolvingParentUrl } = useResolvedProofAsset(actualParentProof);

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

  const childClips = isEditing
    ? proofs.filter((proof) => proof.parent_proof_id === parentProof?.id && proof.proof_child_type === 'ExtractClip')
    : [];

  const canChangeExtractSource = !isEditing || childClips.length === 0;
  const previewUrl = extractSource === 'original' ? resolvedParentUrl : uploadedFile;
  const selectedOriginalRange = useMemo(() => compressPageRange(selectedOriginalPages), [selectedOriginalPages]);

  const resetForm = () => {
    setExtractSource('original');
    setUploadedFile(null);
    setPageRange('');
    setSelectedOriginalPages([]);
    setInternalName('');
    setFormalName('');
    setDraftExhibitNum('');
    setPageRangeError('');
    setWarningMsg('');
    setShowWarning(false);
    setSelectedPartyIds([]);
    setProofTypeId('');
    setIsProcessing(false);
    setAddCoverPage(true);
    setAddPageNumbers(true);
    setOptimizePdf(true);
  };

  useEffect(() => {
    if (!open || !parentProof) return;

    if (isEditing) {
      const usingOriginal = parentProof.file_source === actualParentProof?.file_source && parentProof.dropbox_file_id === actualParentProof?.dropbox_file_id && parentProof.file_url === actualParentProof?.file_url;
      setExtractSource(usingOriginal ? 'original' : 'upload');
      setUploadedFile(usingOriginal ? null : parentProof.file_url || null);
      setPageRange(parentProof.extract_pages || '');
      setSelectedOriginalPages(usingOriginal ? parsePageRange(parentProof.extract_pages || '') : []);
      setInternalName(parentProof.name || '');
      setFormalName(parentProof.formal_name || '');
      setDraftExhibitNum(parentProof.draft_exhibit_num || '');
      setPageRangeError('');
      setWarningMsg('');
      setShowWarning(false);
      setSelectedPartyIds(normalizePartyIds(parentProof));
      setProofTypeId(parentProof.proof_type_category_id || '');
      setAddCoverPage(true);
      setAddPageNumbers(true);
      setOptimizePdf(true);
      setApplyOcr(true);
      return;
    }

    resetForm();
    // Auto-populate from parent proof
    setInternalName(actualParentProof?.name || '');
    setFormalName(actualParentProof?.formal_name || '');
    setDraftExhibitNum(actualParentProof?.draft_exhibit_num || '');
    setSelectedPartyIds(normalizePartyIds(actualParentProof));
    setProofTypeId(actualParentProof?.proof_type_category_id || '');
    setAddCoverPage(true);
    setAddPageNumbers(true);
    setOptimizePdf(true);
  }, [open, parentProof, isEditing, actualParentProof]);

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

    if (extractSource === 'original' && selectedOriginalPages.length === 0) {
      setWarningMsg('Select at least one page from the original PDF');
      setShowWarning(true);
      return;
    }

    if (extractSource === 'upload' && !validatePageRange(pageRange)) {
      return;
    }

    if (selectedPartyIds.length === 0) {
      setWarningMsg('Select at least one party');
      setShowWarning(true);
      return;
    }

    const inheritedFileFields = extractSource === 'original'
      ? {
          file_source: actualParentProof.file_source || 'base44',
          file_url: actualParentProof.file_url || '',
          dropbox_file_id: actualParentProof.dropbox_file_id || '',
          dropbox_path: actualParentProof.dropbox_path || '',
          dropbox_file_name: actualParentProof.dropbox_file_name || '',
        }
      : {
          file_source: 'base44',
          file_url: uploadedFile || '',
          dropbox_file_id: '',
          dropbox_path: '',
          dropbox_file_name: '',
        };

    const extractData = {
       proof_category: parentProof.proof_category,
       file_type: 'PDF',
       proof_child_type: 'Extract',
       name: internalName.trim(),
       formal_name: formalName.trim(),
       parent_proof_id: isEditing ? parentProof.parent_proof_id : parentProof.id,
       party_id: selectedPartyIds[0] || null,
       party_ids: { ids: selectedPartyIds },
       status: parentProof.status === 'Draft' ? 'Draft' : parentProof.status,
       category_id: parentProof.category_id || null,
       proof_type_category_id: proofTypeId || parentProof.proof_type_category_id,
       extract_pages: extractSource === 'original' ? selectedOriginalRange : pageRange.trim(),
       draft_exhibit_num: draftExhibitNum.trim() || null,
       ...inheritedFileFields,
     };

     // If using original Dropbox source and processing is enabled
     if (extractSource === 'original' && isOptimizableDropboxPdf(actualParentProof) && (addCoverPage || addPageNumbers || optimizePdf || applyOcr)) {
       setIsProcessing(true);
       try {
         const processedData = await processDropboxPdf(
           buildProcessDropboxPdfPayload({
             proof: actualParentProof,
             options: {
               addCoverPage,
               addPageNumbers,
               optimizePdf,
               applyOcr,
             },
             metadata: {
               proofName: internalName.trim(),
               formalName: formalName.trim(),
               isExtract: true,
               extractPages: selectedOriginalPages.join(','),
             },
           })
         );
         saveMutation.mutate({ ...extractData, ...processedData });
       } catch (error) {
         setIsProcessing(false);
         console.warn('PDF processing failed, saving extract without optimization:', error.message);
         saveMutation.mutate(extractData);
       }
       return;
     }

     saveMutation.mutate(extractData);
  };

  if (!parentProof) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Extract' : 'Create Extract'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">{isEditing ? `Editing: ${parentProof.formal_name || parentProof.name}` : `From: ${parentProof.formal_name || parentProof.name}`}</p>
              <p className="text-xs text-blue-700 mt-1">{actualParentProof.proof_category === 'Exhibit' ? 'Exhibit' : 'Deposition'} · {actualParentProof.file_type}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">Extract Source</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="extractSource" value="original" checked={extractSource === 'original'} onChange={(e) => setExtractSource(e.target.value)} disabled={!canChangeExtractSource} className="w-4 h-4" />
                <span className="text-sm text-slate-700">Select pages from original PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                <input type="radio" name="extractSource" value="upload" checked={extractSource === 'upload'} onChange={(e) => setExtractSource(e.target.value)} disabled className="w-4 h-4" />
                <span className="text-sm text-slate-700">Upload new snippet</span>
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-2">Upload new snippet is temporarily disabled while we validate the page-selection extract flow.</p>
            {!canChangeExtractSource && <p className="text-xs text-amber-700 mt-2">Extract source is locked because this extract already has child clips attached.</p>}
          </div>

          {extractSource === 'upload' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Upload Shortened PDF</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-2">Click to upload or drag & drop</p>
                <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" id="extractFileUpload" />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('extractFileUpload').click()} disabled={uploadingFile}>
                  {uploadingFile ? 'Uploading...' : 'Select PDF'}
                </Button>
                {uploadedFile && <p className="text-xs text-green-600 mt-2">✓ File uploaded</p>}
              </div>
            </div>
          )}

          {extractSource === 'original' && isResolvingParentUrl && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading original PDF...
            </div>
          )}

          {previewUrl && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">PDF Preview</label>
                  {extractSource === 'original' && (
                    <p className="text-xs text-slate-500">Use the thumbnail rail to select original pages while keeping search, zoom, gestures, and page jump controls.</p>
                  )}
                </div>
                {extractSource === 'original' && (
                  <span className="text-xs font-mono text-blue-700 whitespace-nowrap pt-1">{selectedOriginalRange || 'No pages selected'}</span>
                )}
              </div>

              <div className="bg-slate-900 rounded-lg overflow-hidden h-[32rem] border border-slate-200">
                <PDFViewer
                  fileUrl={previewUrl}
                  mode="controller"
                  selectableThumbnails={extractSource === 'original'}
                  selectedPages={selectedOriginalPages}
                  onSelectedPagesChange={setSelectedOriginalPages}
                  thumbnailWidth={54}
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
                onChange={(e) => {
                  setPageRange(e.target.value);
                  if (pageRangeError) setPageRangeError('');
                }}
                className={pageRangeError ? 'border-red-500' : ''}
              />
              {pageRangeError && <p className="text-xs text-red-600 mt-1">{pageRangeError}</p>}
              <p className="text-xs text-slate-500 mt-1">Use the original page numbers that this uploaded snippet came from.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Internal Name *</label>
              <Input placeholder="e.g. Scene Photo Extract - Pages 1-3" value={internalName} onChange={(e) => setInternalName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Formal Name</label>
              <Input placeholder="e.g. Photograph Pages 1-3" value={formalName} onChange={(e) => setFormalName(e.target.value)} />
            </div>
          </div>

          <PartyMultiSelectField
            label="Assign to Parties"
            required
            parties={parties}
            value={selectedPartyIds}
            onChange={setSelectedPartyIds}
            helperText="Choose one or more parties for this extract."
          />

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Proof Type</label>
            <select
              value={proofTypeId}
              onChange={(e) => setProofTypeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Select proof type</option>
              {proofTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {parentProof.proof_category === 'Exhibit' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Draft Exhibit # (optional)</label>
              <Input placeholder="e.g. A-1a" value={draftExhibitNum} onChange={(e) => setDraftExhibitNum(e.target.value)} />
            </div>
          )}

          {extractSource === 'original' && isOptimizableDropboxPdf(actualParentProof) && (
           <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
             <label className="text-sm font-medium text-slate-700 block">PDF Processing (optional)</label>
             <div className="space-y-2">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" checked={addCoverPage} onChange={(e) => setAddCoverPage(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                 <span className="text-sm text-slate-700">Add cover page</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" checked={addPageNumbers} onChange={(e) => setAddPageNumbers(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                 <span className="text-sm text-slate-700">Add page numbers</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" checked={optimizePdf} onChange={(e) => setOptimizePdf(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                 <span className="text-sm text-slate-700">Optimize PDF (compress & linearize)</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" checked={applyOcr} onChange={(e) => setApplyOcr(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                 <span className="text-sm text-slate-700">Apply OCR if needed</span>
               </label>
             </div>
             <p className="text-xs text-slate-600">OCR will be applied only if enabled and the PDF isn't already searchable.</p>
           </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending || isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing PDF…</> : saveMutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Save Extract')}
            </Button>
          </div>
        </div>

        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" /> Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">{warningMsg}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}