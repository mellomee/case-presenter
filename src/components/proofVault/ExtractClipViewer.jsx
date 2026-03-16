import React, { useEffect, useMemo, useState } from 'react';
import PDFViewer from './PDFViewer';
import { FileText, Layers, Scissors, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useResolvedProofAsset from '@/hooks/useResolvedProofAsset';
import { countGroupedHighlights, countHighlightGroups, getInitialHighlightPage, normalizeHighlightGroups } from './highlightGroupUtils';
import { parsePageRange } from './pageRangeUtils';
import HighlightGroupPanel from './HighlightGroupPanel';

export default function ExtractClipViewer({ proof, allProofs = [], mode = 'controller', syncState, onStateChange }) {
  if (!proof) return null;

  const parentExtract = allProofs.find((p) => p.id === proof.parent_proof_id);
  const originalPDF = parentExtract ? allProofs.find((p) => p.id === parentExtract.parent_proof_id) : null;
  const { url, isLoading } = useResolvedProofAsset(proof);
  const initialPage = getInitialHighlightPage(proof.highlights, proof.clipped_page || 1);
  const visiblePages = parsePageRange(parentExtract?.extract_pages || '');
  const highlightGroups = useMemo(
    () => normalizeHighlightGroups(proof.highlights, proof.clipped_page || 1),
    [proof.highlights, proof.clipped_page]
  );
  const groupCount = countHighlightGroups(proof.highlights, proof.clipped_page || 1);
  const highlightCount = countGroupedHighlights(proof.highlights, proof.clipped_page || 1);
  const initialViewerPage = useMemo(() => {
    if (visiblePages.length > 0) {
      const sourceIndex = visiblePages.indexOf(initialPage);
      return sourceIndex >= 0 ? sourceIndex + 1 : 1;
    }
    return initialPage;
  }, [visiblePages, initialPage]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(highlightGroups[0]?.id || null);
  const [viewMode, setViewMode] = useState('all');
  const [currentPage, setCurrentPage] = useState(initialViewerPage);

  useEffect(() => {
    setSelectedGroupId(highlightGroups[0]?.id || null);
    setViewMode('all');
    setCurrentPage(initialViewerPage);
  }, [proof.id, highlightGroups, initialViewerPage]);

  useEffect(() => {
    if (mode === 'viewer' && syncState?.currentPage) {
      setCurrentPage(syncState.currentPage);
    }
  }, [mode, syncState?.currentPage]);

  const selectedGroup = highlightGroups.find((group) => group.id === selectedGroupId) || null;
  const visibleHighlightGroups = useMemo(() => {
    if (viewMode === 'hidden') return [];
    if (viewMode === 'selected') return selectedGroup ? [selectedGroup] : [];
    return highlightGroups;
  }, [viewMode, selectedGroup, highlightGroups]);

  const handleSelectGroup = (group) => {
    setSelectedGroupId(group.id);
    setViewMode('selected');
    if (visiblePages.length > 0) {
      const sourceIndex = visiblePages.indexOf(group.page);
      setCurrentPage(sourceIndex >= 0 ? sourceIndex + 1 : 1);
      return;
    }
    setCurrentPage(group.page);
  };

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

        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-zinc-300 hover:text-white" onClick={() => setPanelOpen((value) => !value)}>
            {panelOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {panelOpen ? 'Hide Panel' : 'Show Panel'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {isLoading ? (
          <div className="flex items-center justify-center h-full w-full text-zinc-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : url ? (
          <>
            <div className="flex-1 overflow-hidden">
              <PDFViewer
                key={proof.id}
                fileUrl={url}
                mode={mode}
                syncState={syncState}
                onStateChange={onStateChange}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                highlights={visibleHighlightGroups}
                clippedPage={initialPage}
                visiblePages={visiblePages.length > 0 ? visiblePages : null}
              />
            </div>
            {panelOpen && (
              <HighlightGroupPanel
                groups={highlightGroups}
                selectedGroupId={selectedGroupId}
                selectedGroup={selectedGroup}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onSelectGroup={handleSelectGroup}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full w-full text-zinc-500 text-sm">No file attached to this clip</div>
        )}
      </div>
    </div>
  );
}