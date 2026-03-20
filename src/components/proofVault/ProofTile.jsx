import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import ProofViewerModal from './ProofViewerModal';
import ProofActionMenu from './ProofActionMenu';
import { countGroupedHighlights, countHighlightGroups, normalizeHighlightGroups } from './highlightGroupUtils';
import { proofHasLinkedFile } from './proofAssetUtils';
import { parsePageRange } from './pageRangeUtils';

export default function ProofTile({
  proof,
  allProofs = [],
  parties = [],
  categories = [],
  currentTab = 'draft',
  onEdit,
  onDelete,
  onExtract,
  onClip,
  onAddToJoint,
  onAdmitAsExhibit,
  onAdmitAsDemonstrative,
  onRemoveFromJoint,
  onUnAdmit,
  expandedProofId,
  highlightedChildId,
}) {
  const [expanded, setExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const cardRef = React.useRef(null);

  const hasHighlightedDescendant = React.useMemo(() => {
    if (!highlightedChildId) return false;

    const hasDescendant = (parentId) => {
      return allProofs.some((item) => {
        if (item.parent_proof_id !== parentId) return false;
        return item.id === highlightedChildId || hasDescendant(item.id);
      });
    };

    return hasDescendant(proof.id);
  }, [allProofs, proof.id, highlightedChildId]);

  React.useEffect(() => {
    if (proof.id === expandedProofId || hasHighlightedDescendant) {
      setExpanded(true);
    }
  }, [proof.id, expandedProofId, hasHighlightedDescendant]);

  React.useEffect(() => {
    if (proof.id === highlightedChildId) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [proof.id, highlightedChildId]);

  const proofPartyIds = [...new Set([
    proof.party_id,
    ...(Array.isArray(proof.party_ids) ? proof.party_ids : []),
    ...(Array.isArray(proof.party_ids?.ids) ? proof.party_ids.ids : []),
  ].filter(Boolean))];
  const proofParties = parties.filter((item) => proofPartyIds.includes(item.id));
  const category = categories.find((item) => item.id === proof.category_id) || null;

  const children = allProofs.filter((p) => p.parent_proof_id === proof.id);
  const parentProof = proof.parent_proof_id ? allProofs.find((p) => p.id === proof.parent_proof_id) : null;
  const hasChildren = children.length > 0;
  const hasAttachment = proofHasLinkedFile(proof);
  const highlightGroupCount = countHighlightGroups(proof.highlights, proof.clipped_page || 1);
  const highlightCount = countGroupedHighlights(proof.highlights, proof.clipped_page || 1);
  const parentExtract = proof.proof_child_type === 'ExtractClip'
    ? allProofs.find((item) => item.id === proof.parent_proof_id)
    : null;
  const extractSourcePages = parsePageRange(parentExtract?.extract_pages || '');
  const getClipPage = (storedPage) => {
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
  const highlightGroups = normalizeHighlightGroups(proof.highlights, proof.clipped_page || 1).map((group) => ({
    ...group,
    page: getClipPage(group.page),
    sourcePage: getSourcePage(group.page),
  }));

  const getPartyColor = (party) => {
    if (!party) return 'bg-slate-100 text-slate-700';
    switch (party.side) {
      case 'Plaintiff':
        return 'bg-red-100 text-red-700';
      case 'Defense':
        return 'bg-blue-100 text-blue-700';
      case 'Neutral':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-600';
      case 'Joint':
        return 'bg-blue-100 text-blue-700';
      case 'Admitted':
        return 'bg-green-100 text-green-700';
      case 'Demonstrative':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getFileTypeIcon = () => {
    if (proof.file_type === 'PDF') return '📄';
    if (proof.file_type === 'Image') return '🖼️';
    if (proof.file_type === 'Video') return '🎥';
    return '📎';
  };

  const timeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  };

  const formatDuration = (start, end) => {
    const totalSeconds = Math.max(0, timeToSeconds(end) - timeToSeconds(start));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const isParentProof = !proof.parent_proof_id && (proof.file_type === 'PDF' || proof.file_type === 'Video');
  const isExtract = proof.proof_child_type === 'Extract';

  const renderExhibitHistory = () => {
    const pills = [];
    if (proof.draft_exhibit_num) pills.push(<span key="draft" className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-semibold text-slate-700 shadow-sm font-mono">D: {proof.draft_exhibit_num}</span>);
    if (proof.joint_exhibit_num) pills.push(<span key="joint" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700 shadow-sm font-mono">J: {proof.joint_exhibit_num}</span>);
    if (proof.admitted_exhibit_num) pills.push(<span key="admitted" className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-sm font-semibold text-green-700 shadow-sm font-mono">Adm: {proof.admitted_exhibit_num}</span>);
    else if (proof.demonstrative_exhibit_num) pills.push(<span key="demo" className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-sm font-semibold text-purple-700 shadow-sm font-mono">Demo: {proof.demonstrative_exhibit_num}</span>);
    return pills.length > 0 ? pills : null;
  };

  return (
    <>
      <Card ref={cardRef} className={`border-slate-200 hover:shadow-md transition-all cursor-pointer ${proof.id === highlightedChildId ? 'ring-2 ring-amber-400 border-amber-200 bg-amber-50/60' : expanded ? 'ring-2 ring-blue-400' : ''}`}>
        <div className="p-4 flex items-start gap-3" onClick={() => setExpanded(!expanded)}>
          {hasChildren ? (
            <div className="mt-0.5">{expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}</div>
          ) : <div className="w-5" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg mt-0.5">{getFileTypeIcon()}</span>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{proof.name}</h3>
                {proof.formal_name && (
                  <div className="text-xs text-slate-500 truncate">Formal Name: {proof.formal_name}</div>
                )}
                {proof.proof_child_type === 'Extract' && parentProof && (
                  <div className="text-[11px] text-slate-500 truncate mt-1 space-y-0.5">
                    <div>
                      Source PDF: {parentProof.formal_name || parentProof.name}{parentProof.draft_exhibit_num ? ` · D: ${parentProof.draft_exhibit_num}` : ''}
                    </div>
                    {proof.dropbox_file_name && (
                      <div>Extract File: {proof.dropbox_file_name}</div>
                    )}
                  </div>
                )}
                {proof.file_source === 'dropbox' && proof.dropbox_file_name && (
                  <div className="text-xs text-slate-500 truncate">Source Filename: {proof.dropbox_file_name}</div>
                )}
              </div>
            </div>

            <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 flex-wrap items-center">
                <Badge variant="outline" className="text-xs">{proof.file_type}</Badge>
                {proof.file_source === 'dropbox' && <Badge className="bg-blue-50 text-blue-700 text-xs">Dropbox</Badge>}
                {proofParties.map((party) => (
                  <Badge key={party.id} className={`text-xs ${getPartyColor(party)}`}>
                    {party.first_name} {party.last_name}
                  </Badge>
                ))}
                {category && <Badge className="bg-slate-100 text-slate-700 text-xs">{category.name}</Badge>}
                {(isParentProof || isExtract) && (
                  hasAttachment ? (
                    <div className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /><span>Attached</span></div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="w-3.5 h-3.5" /><span>No File</span></div>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {proof.proof_category === 'Exhibit' ? (
                  <Badge className={`text-xs ${getStatusColor(proof.status)}`}>{proof.status}</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">Deposition</Badge>
                )}
                {proof.proof_category === 'Exhibit' && renderExhibitHistory() && (
                  <div className="flex flex-wrap gap-2 lg:justify-end">{renderExhibitHistory()}</div>
                )}
              </div>
            </div>

            {proof.proof_child_type === 'Extract' && proof.extract_pages && (
              <div className="text-xs text-slate-600 mb-2">Pages: <span className="font-mono font-semibold">{proof.extract_pages}</span></div>
            )}

            {proof.proof_child_type === 'ExtractClip' && (
              <div className="text-xs text-slate-600 mb-2 space-y-1">
                <div>
                  Page: <span className="font-mono font-semibold">{proof.clipped_page}</span>
                  {highlightGroupCount > 0 && <span className="ml-2 text-amber-600">• {highlightGroupCount} group{highlightGroupCount === 1 ? '' : 's'} • {highlightCount} highlight{highlightCount === 1 ? '' : 's'}</span>}
                </div>
                {highlightGroups.length > 0 && (
                  <div className="space-y-1">
                    {highlightGroups.map((group) => (
                      <div key={group.id} className="text-[11px] text-slate-500">
                        {group.name} — Pg {group.page}{group.sourcePage ? ` · Source Pg ${group.sourcePage}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {proof.proof_child_type === 'VideoClip' && proof.video_clips && Array.isArray(proof.video_clips) && proof.video_clips.length > 0 && (
              <div className="text-xs text-slate-600 mb-2 space-y-1">
                <div>
                  <span className="text-amber-600">• {proof.video_clips.length} segment{proof.video_clips.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1">
                  {proof.video_clips.map((segment, index) => (
                    <div key={`${segment.start}-${segment.end}-${index}`} className="text-[11px] text-slate-500">
                      {segment.label || `Segment ${index + 1}`} — {segment.start} to {segment.end} · {formatDuration(segment.start, segment.end)}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ProofActionMenu
              proof={proof}
              currentTab={currentTab}
              allProofs={allProofs}
              onEdit={() => onEdit(proof)}
              onView={() => setViewerOpen(true)}
              onExtract={() => onExtract(proof)}
              onClip={() => onClip(proof)}
              onAddToJoint={() => onAddToJoint(proof)}
              onAdmitAsExhibit={() => onAdmitAsExhibit(proof)}
              onAdmitAsDemonstrative={() => onAdmitAsDemonstrative(proof)}
              onRemoveFromJoint={() => onRemoveFromJoint(proof)}
              onUnAdmit={() => onUnAdmit(proof)}
              onDelete={onDelete}
            />
          </div>
        </div>

        {expanded && hasChildren && (
          <div className="border-t border-slate-200 bg-slate-50">
            {children.map((child) => (
              <ProofTile
                key={child.id}
                proof={child}
                allProofs={allProofs}
                currentTab={currentTab}
                onEdit={onEdit}
                onDelete={onDelete}
                onExtract={(p) => onExtract(p)}
                onClip={(p) => onClip(p)}
                onAddToJoint={onAddToJoint}
                onAdmitAsExhibit={onAdmitAsExhibit}
                onAdmitAsDemonstrative={onAdmitAsDemonstrative}
                onRemoveFromJoint={onRemoveFromJoint}
                onUnAdmit={onUnAdmit}
                expandedProofId={expandedProofId}
                highlightedChildId={highlightedChildId}
              />
            ))}
          </div>
        )}
      </Card>

      <ProofViewerModal proof={proof} allProofs={allProofs} isOpen={viewerOpen} onClose={() => setViewerOpen(false)} />
    </>
  );
}