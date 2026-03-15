import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ExtractClipEditor from './ExtractClipEditor';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#FEF3C7', bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { name: 'Green', hex: '#D1FAE5', bg: 'bg-green-100', border: 'border-green-300' },
  { name: 'Blue', hex: '#DBEAFE', bg: 'bg-blue-100', border: 'border-blue-300' },
  { name: 'Red', hex: '#FEE2E2', bg: 'bg-red-100', border: 'border-red-300' },
  { name: 'Purple', hex: '#EDE9FE', bg: 'bg-purple-100', border: 'border-purple-300' },
];

export default function CreateExtractClipModal({ open, onClose, parentExtract, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = parentExtract?.proof_child_type === 'ExtractClip';

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const [clipName, setClipName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('draw');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [selectedOpacity, setSelectedOpacity] = useState(0.35);
  const [highlights, setHighlights] = useState([]);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [numPages, setNumPages] = useState(1);
  const [warning, setWarning] = useState('');
  const [pendingPage, setPendingPage] = useState(null);
  const [showPageWarning, setShowPageWarning] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        return base44.entities.Proof.update(parentExtract.id, data);
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
      setWarning(`Error ${isEditing ? 'saving' : 'creating'} clip: ${error.message}`);
    },
  });

  const resetForm = () => {
    setClipName('');
    setFormalName('');
    setDraftExhibitNum('');
    setDescription('');
    setMode('draw');
    setSelectedColor(HIGHLIGHT_COLORS[0].hex);
    setSelectedOpacity(0.35);
    setHighlights([]);
    setSelectedHighlight(null);
    setCurrentPage(1);
    setPageInput('1');
    setWarning('');
    setPendingPage(null);
    setShowPageWarning(false);
  };

  const actualParentExtract = isEditing
    ? proofs.find((proof) => proof.id === parentExtract?.parent_proof_id) || parentExtract
    : parentExtract;

  useEffect(() => {
    if (!open || !parentExtract) return;

    if (isEditing) {
      const initialPage = parentExtract.clipped_page || 1;
      const existingHighlights = Array.isArray(parentExtract.highlights) ? parentExtract.highlights : [];
      setClipName(parentExtract.name || '');
      setFormalName(parentExtract.formal_name || '');
      setDraftExhibitNum(parentExtract.draft_exhibit_num || '');
      setDescription(parentExtract.description || '');
      setMode('draw');
      setSelectedColor(existingHighlights[0]?.color || HIGHLIGHT_COLORS[0].hex);
      setSelectedOpacity(existingHighlights[0]?.opacity || 0.35);
      setHighlights(existingHighlights);
      setSelectedHighlight(null);
      setCurrentPage(initialPage);
      setPageInput(String(initialPage));
      setWarning('');
      setPendingPage(null);
      setShowPageWarning(false);
      return;
    }

    resetForm();
  }, [open, parentExtract, isEditing]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const requestPageChange = (nextPage) => {
    const safePage = Math.max(1, Math.min(numPages || 1, nextPage));
    if (safePage === currentPage) return;

    if (highlights.length > 0) {
      setPendingPage(safePage);
      setShowPageWarning(true);
      return;
    }

    setCurrentPage(safePage);
    setSelectedHighlight(null);
  };

  const handleSubmit = async () => {
    if (!clipName.trim()) {
      setWarning('Clip Name is required');
      return;
    }
    if (!formalName.trim()) {
      setWarning('Formal Name is required');
      return;
    }

    const clipData = {
      proof_category: parentExtract.proof_category,
      file_type: 'PDF',
      proof_child_type: 'ExtractClip',
      name: clipName.trim(),
      formal_name: formalName.trim(),
      description: description.trim() || null,
      parent_proof_id: isEditing ? parentExtract.parent_proof_id : parentExtract.id,
      party_id: parentExtract.party_id || null,
      status: parentExtract.status,
      category_id: parentExtract.category_id || null,
      file_url: actualParentExtract.file_url,
      clipped_page: currentPage,
      highlights: highlights.length > 0 ? highlights : null,
      draft_exhibit_num: draftExhibitNum.trim() || null,
    };

    saveMutation.mutate(clipData);
  };

  if (!parentExtract) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[1400px] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Extract Clip' : 'Create Extract Clip'}</DialogTitle>
        </DialogHeader>

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Parent info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {isEditing ? `Editing: ${parentExtract.formal_name || parentExtract.name}` : `From: ${parentExtract.formal_name || parentExtract.name}`}
              </p>
              <p className="text-xs text-blue-700 mt-1">Extract of {actualParentExtract.proof_category}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Clip Area</label>
            <ExtractClipEditor
              fileUrl={actualParentExtract.file_url}
              currentPage={currentPage}
              onPageChange={requestPageChange}
              numPages={numPages}
              onNumPagesChange={setNumPages}
              highlights={highlights}
              setHighlights={setHighlights}
              selectedHighlight={selectedHighlight}
              setSelectedHighlight={setSelectedHighlight}
              mode={mode}
              selectedColor={selectedColor}
              selectedOpacity={selectedOpacity}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_180px] gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Clip Name *</label>
                <Input
                  placeholder="Enter a name..."
                  value={clipName}
                  onChange={(e) => setClipName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Formal Name *</label>
                <Input
                  placeholder="Enter formal name..."
                  value={formalName}
                  onChange={(e) => setFormalName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Exhibit #</label>
                <Input
                  placeholder="e.g. A-1"
                  value={draftExhibitNum}
                  onChange={(e) => setDraftExhibitNum(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Description (optional)</label>
              <Input
                placeholder="Additional notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => requestPageChange(currentPage - 1)}
                  className="h-9 w-9 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mx-auto" />
                </button>
                <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 min-w-[82px] text-center">
                  {currentPage}/{numPages || 1}
                </div>
                <button
                  type="button"
                  onClick={() => requestPageChange(currentPage + 1)}
                  className="h-9 w-9 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  disabled={currentPage >= (numPages || 1)}
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>
                <Input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && requestPageChange(parseInt(pageInput, 10) || 1)}
                  className="w-20"
                />
                <Button variant="outline" onClick={() => requestPageChange(parseInt(pageInput, 10) || 1)}>
                  Go to
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('draw')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'draw' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Draw
                </button>
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'select' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Select
                </button>
                <div className="flex items-center gap-2 px-1">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      title={color.name}
                      onClick={() => setSelectedColor(color.hex)}
                      className={`h-7 w-7 rounded-full border-2 ${selectedColor === color.hex ? 'border-slate-900 scale-110' : 'border-white'} transition`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 min-w-[150px]">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={selectedOpacity}
                    onChange={(e) => setSelectedOpacity(parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-600 w-10">{Math.round(selectedOpacity * 100)}%</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (selectedHighlight === null) return;
                    setHighlights(highlights.filter((_, idx) => idx !== selectedHighlight));
                    setSelectedHighlight(null);
                  }}
                  disabled={selectedHighlight === null}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saveMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saveMutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Save Extract Clip')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AlertDialog open={showPageWarning} onOpenChange={setShowPageWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move highlights to a different page?</AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">
                Highlights can only live on one page. If you continue, highlights from the current page will be removed so you can create new ones on page {pendingPage}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel
                onClick={() => {
                  setPendingPage(null);
                  setShowPageWarning(false);
                }}
              >
                No
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setHighlights([]);
                  setSelectedHighlight(null);
                  setCurrentPage(pendingPage || currentPage);
                  setPendingPage(null);
                  setShowPageWarning(false);
                }}
              >
                Yes, proceed
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}