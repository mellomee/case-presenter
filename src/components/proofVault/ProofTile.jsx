import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { compressPageRange } from './pageRangeUtils';
import ProofViewerModal from './ProofViewerModal';
import ProofActionMenu from './ProofActionMenu';

export default function ProofTile({ 
  proof, 
  allProofs = [], 
  currentTab = 'draft',
  isExpanded = false,
  onExpandChange,
  highlightedProofId,
  onEdit, 
  onDelete,
  onExtract,
  onClip,
  onAddToJoint,
  onAdmitAsExhibit,
  onAdmitAsDemonstrative,
  onRemoveFromJoint,
  onUnAdmit,
}) {
  const [expanded, setExpanded] = useState(isExpanded);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded]);

  const handleExpandChange = (newExpanded) => {
    setExpanded(newExpanded);
    if (onExpandChange) {
      onExpandChange(newExpanded);
    }
  };

  const { data: party } = useQuery({
    queryKey: ['party', proof.party_id],
    queryFn: () =>
      proof.party_id ? base44.entities.Party.list().then((parties) => parties.find((p) => p.id === proof.party_id)) : null,
    enabled: !!proof.party_id,
  });

  const { data: category } = useQuery({
    queryKey: ['category', proof.category_id],
    queryFn: () =>
      proof.category_id ? base44.entities.Category.list().then((cats) => cats.find((c) => c.id === proof.category_id)) : null,
    enabled: !!proof.category_id,
  });

  // Get children proofs
  const children = allProofs.filter((p) => p.parent_proof_id === proof.id);
  const hasChildren = children.length > 0;

  // Determine party color label
  const getPartyColor = () => {
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

  const hasAttachment = proof.file_url || proof.video_url;
  const isParentProof = !proof.parent_proof_id && (proof.file_type === 'PDF' || proof.file_type === 'Video');
  const isExtract = proof.proof_child_type === 'Extract';

  const renderExhibitHistory = () => {
    const pills = [];
    if (proof.draft_exhibit_num) {
      pills.push(
        <span key="draft" className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono">
          D: {proof.draft_exhibit_num}
        </span>
      );
    }
    if (proof.joint_exhibit_num) {
      pills.push(
        <span key="joint" className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-mono">
          J: {proof.joint_exhibit_num}
        </span>
      );
    }
    if (proof.admitted_exhibit_num) {
      pills.push(
        <span key="admitted" className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-mono">
          Adm: {proof.admitted_exhibit_num}
        </span>
      );
    } else if (proof.demonstrative_exhibit_num) {
      pills.push(
        <span key="demo" className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-mono">
          Demo: {proof.demonstrative_exhibit_num}
        </span>
      );
    }
    return pills.length > 0 ? pills : null;
  };

  return (
    <>
      <Card className={`border-slate-200 hover:shadow-md transition-all cursor-pointer ${expanded ? 'ring-2 ring-blue-400' : ''}`}>
        {/* Header Row */}
        <div
          className="p-4 flex items-start gap-3"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren && (
            <div className="mt-0.5">
              {expanded ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </div>
          )}
          {!hasChildren && <div className="w-5" />}

          {/* Name & Type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getFileTypeIcon()}</span>
              <h3 className="font-semibold text-slate-900 truncate">{proof.name}</h3>
              {proof.formal_name && (
                <span className="text-xs text-slate-500 italic truncate">({proof.formal_name})</span>
              )}
            </div>

            {/* Badges Row 1: Type, Party, Category, Attachment Status */}
            <div className="flex gap-2 mb-2 flex-wrap items-center">
              <Badge variant="outline" className="text-xs">
                {proof.file_type}
              </Badge>
              {party && (
                <Badge className={`text-xs ${getPartyColor()}`}>
                  {party.first_name} {party.last_name}
                </Badge>
              )}
              {category && <Badge className="bg-slate-100 text-slate-700 text-xs">{category.name}</Badge>}
              {(isParentProof || isExtract) && (
                hasAttachment ? (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attached</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>No File</span>
                  </div>
                )
              )}
            </div>

            {/* Exhibit # History (for Exhibits) */}
            {proof.proof_category === 'Exhibit' && renderExhibitHistory() && (
              <div className="flex gap-1 mb-2 flex-wrap">{renderExhibitHistory()}</div>
            )}

            {/* Extract Pages (for Extract child) */}
            {proof.proof_child_type === 'Extract' && proof.extract_pages && (
              <div className="text-xs text-slate-600 mb-2">
                Pages: <span className="font-mono font-semibold">{compressPageRange(proof.extract_pages.split(',').map(Number))}</span>
              </div>
            )}

            {/* Clipped Page (for ExtractClip grandchild) */}
            {proof.proof_child_type === 'ExtractClip' && proof.clipped_page && (
              <div className="text-xs text-slate-600 mb-2">
                Page: <span className="font-mono font-semibold">{proof.clipped_page}</span>
                {proof.highlights && Array.isArray(proof.highlights) && proof.highlights.length > 0 && (
                  <span className="ml-2 text-amber-600">• {proof.highlights.length} highlight{proof.highlights.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}

            {/* Video Clips (for VideoClip child) */}
            {proof.proof_child_type === 'VideoClip' && proof.video_clips && Array.isArray(proof.video_clips) && proof.video_clips.length > 0 && (
              <div className="text-xs text-slate-600 mb-2">
                <span className="text-amber-600">• {proof.video_clips.length} segment{proof.video_clips.length !== 1 ? 's' : ''}</span>
                {proof.video_clips.length <= 2 && (
                  <span className="ml-2 text-slate-500">
                    {proof.video_clips.map((clip) => `${clip.start}–${clip.end}`).join(', ')}
                  </span>
                )}
              </div>
            )}

            {/* Status Pill (for Exhibits) */}
            {proof.proof_category === 'Exhibit' && (
              <Badge className={`text-xs ${getStatusColor(proof.status)}`}>{proof.status}</Badge>
            )}
            {proof.proof_category === 'Deposition' && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">Deposition</Badge>
            )}
          </div>

          {/* Action Menu */}
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

        {/* Children Accordion */}
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
              />
            ))}
          </div>
        )}
      </Card>

      <ProofViewerModal proof={proof} allProofs={allProofs} isOpen={viewerOpen} onClose={() => setViewerOpen(false)} />
    </>
  );
}