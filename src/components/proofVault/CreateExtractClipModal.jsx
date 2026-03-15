import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [warning, setWarning] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Proof.create(data);
    },
    onSuccess: (createdProof) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      onSuccess?.(createdProof);
      resetForm();
      onClose();
    },
    onError: (error) => {
      setWarning(`Error creating clip: ${error.message}`);
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
    setWarning('');
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
      parent_proof_id: parentExtract.id,
      party_id: parentExtract.party_id || null,
      status: parentExtract.status,
      category_id: parentExtract.category_id || null,
      file_url: parentExtract.file_url,
      clipped_page: currentPage,
      highlights: highlights.length > 0 ? highlights : null,
      draft_exhibit_num: draftExhibitNum.trim() || null,
    };

    createMutation.mutate(clipData);
  };

  if (!parentExtract) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[1400px] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Extract Clip</DialogTitle>
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
                From: {parentExtract.formal_name || parentExtract.name}
              </p>
              <p className="text-xs text-blue-700 mt-1">Extract of {parentExtract.proof_category}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Clip Area</label>
            <ExtractClipEditor
              fileUrl={parentExtract.file_url}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              highlights={highlights}
              setHighlights={setHighlights}
              selectedHighlight={selectedHighlight}
              setSelectedHighlight={setSelectedHighlight}
              mode={mode}
              setMode={setMode}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              selectedOpacity={selectedOpacity}
              setSelectedOpacity={setSelectedOpacity}
            />
            <p className="text-xs text-slate-500">
              {mode === 'draw' ? 'Drag directly on the PDF page to create a highlight.' : 'Click an existing highlight on the PDF page to select it.'}
            </p>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Clip Name (Internal) *</label>
              <Input
                placeholder="e.g. Scene Close-up"
                value={clipName}
                onChange={(e) => setClipName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Draft Exhibit # (optional)</label>
              <Input
                placeholder="e.g. A-1a"
                value={draftExhibitNum}
                onChange={(e) => setDraftExhibitNum(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Formal Name *</label>
            <Input
              placeholder="e.g. Photograph - Intersection Close-up"
              value={formalName}
              onChange={(e) => setFormalName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Description (optional)</label>
            <Input
              placeholder="Additional notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? 'Creating...' : 'Save Extract Clip'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}