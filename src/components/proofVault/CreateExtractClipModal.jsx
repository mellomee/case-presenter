import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PDFViewer from './PDFViewer';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import HighlightWorkspaceSidebar from './HighlightWorkspaceSidebar.jsx';
import { parsePageRange } from './pageRangeUtils';
import {
  createHighlightGroup,
  flattenHighlightGroupsForPage,
  getInitialHighlightPage,
  normalizeHighlightGroups,
} from './highlightGroupUtils';
import PartyMultiSelectField from '@/components/proofVault/PartyMultiSelectField.jsx';

const HIGHLIGHT_COLORS = [
  { name: 'Red', hex: '#ce0909' },
  { name: 'Yellow', hex: '#FEF3C7' },
  { name: 'Green', hex: '#D1FAE5' },
  { name: 'Blue', hex: '#DBEAFE' },
  { name: 'Purple', hex: '#EDE9FE' },
];

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function normalizePartyIds(currentProof) {
  const raw = currentProof?.party_ids;
  if (raw && !Array.isArray(raw) && Array.isArray(raw.ids)) {
    return raw.ids.filter(Boolean);
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter(Boolean);
  }
  return currentProof?.party_id ? [currentProof.party_id] : [];
}

export default function CreateExtractClipModal({ open, onClose, parentExtract, onSuccess }) {
  const queryClient = useQueryClient();
  const overlayRef = useRef(null);
  const dragStartRef = useRef(null);
  const moveHighlightRef = useRef(null);
  const isEditing = parentExtract?.proof_child_type === 'ExtractClip';

  const [clipName, setClipName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [draftExhibitNum, setDraftExhibitNum] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('highlight');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [selectedOpacity, setSelectedOpacity] = useState(0.15);
  const [highlightGroups, setHighlightGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftHighlight, setDraftHighlight] = useState(null);
  const [warning, setWarning] = useState('');
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [selectedPartyIds, setSelectedPartyIds] = useState([]);
  const [proofTypeId, setProofTypeId] = useState('');

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const actualParentExtract = isEditing
    ? proofs.find((proof) => proof.id === parentExtract?.parent_proof_id) || parentExtract
    : parentExtract;

  const extractSourcePages = useMemo(
    () => parsePageRange(actualParentExtract?.extract_pages || ''),
    [actualParentExtract?.extract_pages]
  );

  const mapStoredPageToEditorPage = (storedPage) => {
    if (!extractSourcePages.length) return storedPage || 1;
    const isWithinClipRange = storedPage >= 1 && storedPage <= extractSourcePages.length;
    const matchingSourceIndex = extractSourcePages.indexOf(storedPage);
    if (!isWithinClipRange && matchingSourceIndex >= 0) {
      return matchingSourceIndex + 1;
    }
    return storedPage || 1;
  };

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const { url: resolvedParentUrl, isLoading: isResolvingParentUrl } = useResolvedProofAsset(actualParentExtract);

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
    setMode('highlight');
    setSelectedColor(HIGHLIGHT_COLORS[0].hex);
    setSelectedOpacity(0.15);
    setHighlightGroups([]);
    setSelectedGroupId(null);
    setSelectedHighlight(null);
    setCurrentPage(1);
    setDraftHighlight(null);
    setWarning('');
    setWorkspaceCollapsed(false);
    setSelectedPartyIds([]);
    setProofTypeId('');
  };

  useEffect(() => {
    if (!open || !parentExtract) return;

    if (isEditing) {
      const normalizedGroups = normalizeHighlightGroups(parentExtract.highlights, parentExtract.clipped_page || 1)
        .map((group) => ({
          ...group,
          page: mapStoredPageToEditorPage(group.page),
        }));
      setClipName(parentExtract.name || '');
      setFormalName(parentExtract.formal_name || '');
      setDraftExhibitNum(parentExtract.draft_exhibit_num || '');
      setDescription(parentExtract.description || '');
      setMode('highlight');
      setSelectedColor(HIGHLIGHT_COLORS[0].hex);
      setSelectedOpacity(0.45);
      setHighlightGroups(normalizedGroups);
      setSelectedGroupId(normalizedGroups[0]?.id || null);
      setSelectedHighlight(null);
      setCurrentPage(normalizedGroups[0]?.page || mapStoredPageToEditorPage(parentExtract.clipped_page || 1));
      setDraftHighlight(null);
      setWarning('');
      setSelectedPartyIds(normalizePartyIds(parentExtract));
      setProofTypeId(parentExtract.proof_type_category_id || actualParentExtract?.proof_type_category_id || '');
      return;
    }

    resetForm();
    setSelectedPartyIds(normalizePartyIds(actualParentExtract));
    setProofTypeId(actualParentExtract?.proof_type_category_id || '');
  }, [open, parentExtract, actualParentExtract, isEditing]);

  const usesExtractedPdfFile = Boolean(
    actualParentExtract?.proof_child_type === 'Extract'
    && actualParentExtract?.optimized_for_viewer
    && ((actualParentExtract?.original_dropbox_file_id && actualParentExtract?.original_dropbox_file_id !== actualParentExtract?.dropbox_file_id)
      || (actualParentExtract?.original_dropbox_path && actualParentExtract?.original_dropbox_path !== actualParentExtract?.dropbox_path))
  );

  const visibleExtractPages = useMemo(() => {
    // When the extract already has its own generated PDF file, use the real page count.
    if (usesExtractedPdfFile || actualParentExtract?.optimized_with_cover_page) return null;
    return parsePageRange(actualParentExtract?.extract_pages || '');
  }, [usesExtractedPdfFile, actualParentExtract?.extract_pages, actualParentExtract?.optimized_with_cover_page]);

  const groupsOnCurrentPage = useMemo(
    () => highlightGroups.filter((group) => group.page === currentPage),
    [highlightGroups, currentPage]
  );

  const overlayHighlights = useMemo(
    () => flattenHighlightGroupsForPage(highlightGroups, currentPage, currentPage),
    [highlightGroups, currentPage]
  );

  const selectedGroup = highlightGroups.find((group) => group.id === selectedGroupId) || null;

  const getPoint = (event) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  };

  const createGroupForCurrentPage = (withHighlight = null) => {
    const nextGroup = createHighlightGroup(currentPage, highlightGroups.length);
    const completeGroup = {
      ...nextGroup,
      highlights: withHighlight ? [withHighlight] : [],
    };
    setHighlightGroups((prev) => [...prev, completeGroup]);
    setSelectedGroupId(completeGroup.id);
    return completeGroup;
  };

  const handleOverlayMouseDown = (event) => {
    const point = getPoint(event);
    if (!point) return;

    if (mode === 'move-highlight') {
      if (!selectedHighlight) return;
      const targetHighlight = overlayHighlights.find(
        (highlight) => highlight.__groupId === selectedHighlight.groupId && highlight.__highlightIndex === selectedHighlight.highlightIndex
      );
      if (!targetHighlight) return;
      moveHighlightRef.current = {
        startPoint: point,
        startHighlight: { ...targetHighlight },
      };
      return;
    }

    if (mode !== 'highlight') return;
    dragStartRef.current = point;
    setDraftHighlight({ x: point.x, y: point.y, width: 0, height: 0, color: selectedColor, opacity: selectedOpacity });
    setSelectedHighlight(null);
  };

  const handleOverlayMouseMove = (event) => {
    const point = getPoint(event);
    if (!point) return;

    if (mode === 'move-highlight' && moveHighlightRef.current && selectedHighlight) {
      const { startPoint, startHighlight } = moveHighlightRef.current;
      const nextX = clamp(startHighlight.x + (point.x - startPoint.x), 0, 100 - startHighlight.width);
      const nextY = clamp(startHighlight.y + (point.y - startPoint.y), 0, 100 - startHighlight.height);

      setHighlightGroups((prev) =>
        prev.map((group) => {
          if (group.id !== selectedHighlight.groupId) return group;
          return {
            ...group,
            highlights: group.highlights.map((highlight, index) =>
              index === selectedHighlight.highlightIndex ? { ...highlight, x: nextX, y: nextY } : highlight
            ),
          };
        })
      );
      return;
    }

    if (mode !== 'highlight' || !dragStartRef.current) return;

    const start = dragStartRef.current;
    setDraftHighlight({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
      color: selectedColor,
      opacity: selectedOpacity,
    });
  };

  const handleOverlayMouseUp = () => {
    if (mode === 'move-highlight') {
      moveHighlightRef.current = null;
      return;
    }

    if (mode !== 'highlight' || !dragStartRef.current || !draftHighlight) return;

    if (draftHighlight.width > 0.8 && draftHighlight.height > 0.8) {
      const targetGroup = selectedGroup && selectedGroup.page === currentPage ? selectedGroup : createGroupForCurrentPage();
      setHighlightGroups((prev) =>
        prev.map((group) =>
          group.id === targetGroup.id
            ? { ...group, highlights: [...group.highlights, draftHighlight] }
            : group
        )
      );
      setSelectedGroupId(targetGroup.id);
    }

    dragStartRef.current = null;
    setDraftHighlight(null);
  };

  const clearDraft = () => {
    dragStartRef.current = null;
    moveHighlightRef.current = null;
    setDraftHighlight(null);
  };

  const deleteSelectedHighlight = () => {
    if (!selectedHighlight) return;
    setHighlightGroups((prev) =>
      prev
        .map((group) => {
          if (group.id !== selectedHighlight.groupId) return group;
          return {
            ...group,
            highlights: group.highlights.filter((_, index) => index !== selectedHighlight.highlightIndex),
          };
        })
        .filter((group) => group.highlights.length > 0)
    );
    setSelectedHighlight(null);
  };

  const deleteSelectedGroup = () => {
    if (!selectedGroupId) return;
    const remainingGroups = highlightGroups.filter((group) => group.id !== selectedGroupId);
    setHighlightGroups(remainingGroups);
    setSelectedGroupId(remainingGroups[0]?.id || null);
    setSelectedHighlight(null);
  };

  const handleOpacityChange = (value) => {
    const nextOpacity = parseFloat(value);
    setSelectedOpacity(nextOpacity);

    if (!selectedHighlight) return;

    setHighlightGroups((prev) =>
      prev.map((group) => {
        if (group.id !== selectedHighlight.groupId) return group;
        return {
          ...group,
          highlights: group.highlights.map((highlight, index) =>
            index === selectedHighlight.highlightIndex ? { ...highlight, opacity: nextOpacity } : highlight
          ),
        };
      })
    );
  };

  const handleSubmit = () => {
    if (!clipName.trim()) {
      setWarning('Clip Name is required');
      return;
    }
    const cleanedGroups = highlightGroups.filter((group) => group.highlights.length > 0);
    if (cleanedGroups.length === 0) {
      setWarning('Add at least one highlight group');
      return;
    }
    if (selectedPartyIds.length === 0) {
      setWarning('Select at least one party');
      return;
    }

    const clipData = {
      proof_category: actualParentExtract.proof_category,
      file_type: 'PDF',
      proof_child_type: 'ExtractClip',
      name: clipName.trim(),
      formal_name: formalName.trim(),
      description: description.trim() || null,
      parent_proof_id: isEditing ? parentExtract.parent_proof_id : actualParentExtract.id,
      party_id: selectedPartyIds[0] || null,
      party_ids: { ids: selectedPartyIds },
      status: actualParentExtract.status,
      category_id: actualParentExtract.category_id || null,
      proof_type_category_id: proofTypeId || actualParentExtract.proof_type_category_id,
      file_source: actualParentExtract.file_source || 'base44',
      file_url: actualParentExtract.file_url || '',
      dropbox_file_id: actualParentExtract.dropbox_file_id || '',
      dropbox_path: actualParentExtract.dropbox_path || '',
      dropbox_file_name: actualParentExtract.dropbox_file_name || '',
      clipped_page: cleanedGroups[0].page,
      highlights: cleanedGroups,
      draft_exhibit_num: draftExhibitNum.trim() || null,
    };

    saveMutation.mutate(clipData);
  };

  if (!parentExtract || !actualParentExtract) return null;

  const pageOverlay = (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-20 ${mode === 'pan' ? 'pointer-events-none' : 'pointer-events-auto'} ${mode === 'highlight' ? 'cursor-crosshair' : mode === 'select' ? 'cursor-pointer' : mode === 'move-highlight' ? 'cursor-move' : 'cursor-default'}`}
      onMouseDown={handleOverlayMouseDown}
      onMouseMove={handleOverlayMouseMove}
      onMouseUp={handleOverlayMouseUp}
      onMouseLeave={clearDraft}
      onClick={(event) => {
        if (mode === 'select' && event.target === event.currentTarget) {
          setSelectedHighlight(null);
        }
      }}
    >
      {overlayHighlights.map((highlight) => (
        <button
          key={`${highlight.__groupId}-${highlight.__highlightIndex}`}
          type="button"
          className={`absolute rounded-sm ${mode === 'select' ? 'cursor-pointer' : 'pointer-events-none'} ${selectedHighlight?.groupId === highlight.__groupId && selectedHighlight?.highlightIndex === highlight.__highlightIndex ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
          style={{
            left: `${highlight.x}%`,
            top: `${highlight.y}%`,
            width: `${highlight.width}%`,
            height: `${highlight.height}%`,
            background: highlight.color,
            opacity: highlight.opacity,
            mixBlendMode: 'multiply',
          }}
          onClick={(event) => {
            if (mode !== 'select') return;
            event.stopPropagation();
            setSelectedGroupId(highlight.__groupId);
            setSelectedHighlight({ groupId: highlight.__groupId, highlightIndex: highlight.__highlightIndex });
            setSelectedOpacity(highlight.opacity ?? 0.45);
          }}
        />
      ))}
      {draftHighlight && (
        <div
          className="absolute rounded-sm pointer-events-none"
          style={{
            left: `${draftHighlight.x}%`,
            top: `${draftHighlight.y}%`,
            width: `${draftHighlight.width}%`,
            height: `${draftHighlight.height}%`,
            background: draftHighlight.color,
            opacity: draftHighlight.opacity,
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Highlights' : 'Add Highlights'}</DialogTitle>
        </DialogHeader>

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {isEditing ? `Editing: ${parentExtract.formal_name || parentExtract.name}` : `From: ${actualParentExtract.formal_name || actualParentExtract.name}`}
              </p>
              <p className="text-xs text-blue-700 mt-1">Grouped highlights can span multiple pages in the same clip.</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <PartyMultiSelectField
              label="Assign to Parties"
              required
              parties={parties}
              value={selectedPartyIds}
              onChange={setSelectedPartyIds}
              helperText="Choose one or more parties for this extract clip."
            />
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="flex h-[70vh] max-h-[70vh] min-h-0 overflow-hidden">
              <HighlightWorkspaceSidebar
                isCollapsed={workspaceCollapsed}
                onToggleCollapsed={() => setWorkspaceCollapsed((value) => !value)}
                groupsOnCurrentPage={groupsOnCurrentPage}
                currentPage={currentPage}
                mode={mode}
                onModeChange={setMode}
                selectedHighlight={selectedHighlight}
                onDeleteSelectedHighlight={deleteSelectedHighlight}
                colors={HIGHLIGHT_COLORS}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
                selectedOpacity={selectedOpacity}
                onOpacityChange={handleOpacityChange}
                clipName={clipName}
                onClipNameChange={setClipName}
                formalName={formalName}
                onFormalNameChange={setFormalName}
                draftExhibitNum={draftExhibitNum}
                onDraftExhibitNumChange={setDraftExhibitNum}
                description={description}
                onDescriptionChange={setDescription}
                proofTypeId={proofTypeId}
                onProofTypeIdChange={setProofTypeId}
                proofTypes={proofTypes}
                onCreateGroup={() => createGroupForCurrentPage()}
                selectedGroupId={selectedGroupId}
                onDeleteSelectedGroup={deleteSelectedGroup}
                highlightGroups={highlightGroups}
                onSelectGroup={(groupId, page) => {
                  setSelectedGroupId(groupId);
                  setCurrentPage(page);
                  setSelectedHighlight(null);
                }}
                onRenameGroup={(groupId, nextName) => {
                  setHighlightGroups((prev) => prev.map((item) => item.id === groupId ? { ...item, name: nextName } : item));
                }}
              />

              <div className="flex-1 min-w-0 min-h-0 bg-slate-900">
                {isResolvingParentUrl ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 h-full justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading extract PDF...
                  </div>
                ) : (
                  <div className="h-full overflow-hidden">
                    <PDFViewer
                      fileUrl={resolvedParentUrl}
                      mode="controller"
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      allowPan={mode === 'pan'}
                      pageOverlay={pageOverlay}
                      visiblePages={visibleExtractPages && visibleExtractPages.length > 0 ? visibleExtractPages : null}
                      selectableThumbnails={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Save Extract Clip')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}