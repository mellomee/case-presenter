import React, { useMemo, useState } from 'react';
import PDFViewer from './PDFViewer';
import { FileText, Layers, Scissors, Loader2 } from 'lucide-react';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { countGroupedHighlights, countHighlightGroups, getInitialHighlightPage, normalizeHighlightGroups } from './highlightGroupUtils';
import { parsePageRange } from './pageRangeUtils';
import HighlightGroupPanel from './HighlightGroupPanel.jsx';

export default function ExtractClipViewer({ proof, allProofs = [], mode = 'controller', syncState, onStateChange }) {
  if (!proof) return null;

  const parentExtract = allProofs.find((p) => p.id === proof.parent_proof_id);
  const originalPDF = parentExtract ? allProofs.find((p) => p.id === parentExtract.parent_proof_id) : null;
  const { url, isLoading } = useResolvedProofAsset(proof);
  const extractSourcePages = parsePageRange(parentExtract?.extract_pages || '');
  const usesExtractedPdfFile = Boolean(
    parentExtract?.proof_child_type === 'Extract'
    && parentExtract?.optimized_for_viewer
    && ((parentExtract?.original_dropbox_file_id && parentExtract?.original_dropbox_file_id !== parentExtract?.dropbox_file_id)
      || (parentExtract?.original_dropbox_path && parentExtract?.original_dropbox_path !== parentExtract?.dropbox_path))
  );
  const pdfVisiblePages = usesExtractedPdfFile || parentExtract?.optimized_with_cover_page
    ? null
    : (extractSourcePages.length > 0 ? extractSourcePages : null);
  const getViewerPageIndex = (storedPage) => {
    if (!extractSourcePages.length) return storedPage || 1;
    const isWithinClipRange = storedPage >= 1 && storedPage <= extractSourcePages.length;
    const matchingSourceIndex = extractSourcePages.indexOf(storedPage);
    if (!isWithinClipRange && matchingSourceIndex >= 0) {
      return matchingSourceIndex + 1;
    }
    return storedPage || 1;
  };
  const getSourcePage = (storedPage) => {
    if (!extractSourcePages.length) return null;
    if (storedPage >= 1 && storedPage <= extractSourcePages.length) {
      return extractSourcePages[storedPage - 1] || null;
    }
    return extractSourcePages.includes(storedPage) ? storedPage : null;
  };
  const initialPage = getViewerPageIndex(getInitialHighlightPage(proof.highlights, proof.clipped_page || 1));
  const groupCount = countHighlightGroups(proof.highlights, proof.clipped_page || 1);
  const highlightCount = countGroupedHighlights(proof.highlights, proof.clipped_page || 1);
  const groups = useMemo(
    () => normalizeHighlightGroups(proof.highlights, proof.clipped_page || 1).map((group) => ({
      ...group,
      page: getViewerPageIndex(group.page),
      sourcePage: getSourcePage(group.page),
    })),
    [proof.highlights, proof.clipped_page, extractSourcePages]
  );
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [showHighlights, setShowHighlights] = useState(true);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [focusTarget, setFocusTarget] = useState(null);
  const filteredHighlights = useMemo(() => {
    if (!showHighlights) return [];
    if (selectedGroupId === 'all') return groups;
    const selectedGroup = groups.find((group) => group.id === selectedGroupId);
    return selectedGroup ? [selectedGroup] : [];
  }, [showHighlights, selectedGroupId, groups]);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="shrink-0 bg-zinc-800 border-b border-zinc-700 px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {originalPDF && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-zinc-500">PDF:</span>
              <span className="text-zinc-200 font-medium">{originalPDF.name}</span>
            </div>
            <span className="text-zinc-600 text-xs">›</span>
          </>
        )}

        {parentExtract && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-zinc-500">Extract:</span>
              <span className="text-zinc-200 font-medium">{parentExtract.name}</span>
            </div>
            <span className="text-zinc-600 text-xs">›</span>
          </>
        )}

        <div className="flex items-center gap-1.5 text-xs">
          <Scissors className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="text-zinc-500">Clip:</span>
          <span className="text-zinc-200 font-semibold">{proof.name}</span>
          <span className="ml-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] px-1.5 py-0.5 rounded font-mono">Page {initialPage}</span>
          <span className="ml-1 text-[10px] text-amber-300">{groupCount} group{groupCount === 1 ? '' : 's'} • {highlightCount} highlight{highlightCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex min-h-0">
        <HighlightGroupPanel
          isCollapsed={panelCollapsed}
          onToggleCollapsed={() => setPanelCollapsed((value) => !value)}
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={(groupId) => {
            setSelectedGroupId(groupId);
            setShowHighlights(true);
            const selectedGroup = groups.find((group) => group.id === groupId);
            if (selectedGroup) {
              setCurrentPage(selectedGroup.page);
              setFocusTarget({
                id: selectedGroup.id,
                page: selectedGroup.page,
                highlights: selectedGroup.highlights,
                requestedAt: Date.now(),
              });
              if (mode === 'controller') {
                onStateChange?.({ currentPage: selectedGroup.page });
              }
            }
          }}
          onShowAll={() => {
            setSelectedGroupId('all');
            setShowHighlights(true);
            setFocusTarget(null);
          }}
          showHighlights={showHighlights}
          onToggleHighlights={() => setShowHighlights((value) => !value)}
        />

        <div className="flex-1 overflow-hidden min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : url ? (
            <PDFViewer
              key={proof.id}
              fileUrl={url}
              mode={mode}
              syncState={syncState}
              onStateChange={onStateChange}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              highlights={filteredHighlights}
              focusTarget={focusTarget}
              clippedPage={initialPage}
              visiblePages={pdfVisiblePages}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No file attached to this clip</div>
          )}
        </div>
      </div>
    </div>
  );
}