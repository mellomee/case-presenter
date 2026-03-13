import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Compress page ranges: "12,13,14,15,16,17,22,23,24,28" → "12-17, 22-24, 28"
function compressPages(pagesStr) {
  if (!pagesStr) return null;
  const pages = pagesStr.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p)).sort((a, b) => a - b);
  if (pages.length === 0) return null;

  const ranges = [];
  let start = pages[0];
  let end = pages[0];

  for (let i = 1; i < pages.length; i++) {
    if (pages[i] === end + 1) {
      end = pages[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = pages[i];
      end = pages[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(', ');
}

// Party color mapping
function getPartySideColor(side) {
  switch (side) {
    case 'Plaintiff':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'Defense':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'Neutral':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function getStatusColor(status) {
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
}

function getFileTypeIcon(fileType) {
  switch (fileType) {
    case 'PDF':
      return '📄';
    case 'Image':
      return '🖼️';
    case 'Video':
      return '🎥';
    default:
      return '📋';
  }
}

export default function ProofCard({ proof, onEdit, onDelete, allProofs = [] }) {
  const [expanded, setExpanded] = useState(false);

  const { data: party } = useQuery({
    queryKey: ['party', proof.party_id],
    queryFn: () =>
      proof.party_id
        ? base44.entities.Party.list().then((parties) => parties.find((p) => p.id === proof.party_id))
        : null,
    enabled: !!proof.party_id,
  });

  const { data: category } = useQuery({
    queryKey: ['category', proof.category_id],
    queryFn: () =>
      proof.category_id
        ? base44.entities.Category.list().then((cats) => cats.find((c) => c.id === proof.category_id))
        : null,
    enabled: !!proof.category_id,
  });

  // Get children (Extracts or VideoClips)
  const children = allProofs.filter((p) => p.parent_proof_id === proof.id);

  const isDeposition = proof.proof_category === 'Deposition';
  const partyDisplay = party ? `${party.first_name} ${party.last_name}` : null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
      {/* Main row */}
      <Card className="p-4 hover:shadow-sm transition-shadow rounded-none border-none m-0">
        <div className="flex items-start gap-3">
          {/* Expand button (only if has children) */}
          {children.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 text-slate-600 hover:text-slate-900 pt-1"
            >
              {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          )}
          {children.length === 0 && <div className="w-5 shrink-0" />}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title + File Type */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm">{proof.name}</h3>
                {proof.formal_name && proof.formal_name !== proof.name && (
                  <p className="text-xs text-slate-500 italic mt-0.5">{proof.formal_name}</p>
                )}
              </div>
              <span className="text-sm shrink-0">{getFileTypeIcon(proof.file_type)}</span>
            </div>

            {/* Description */}
            {proof.description && <p className="text-xs text-slate-600 mb-2 line-clamp-2">{proof.description}</p>}

            {/* Badges row */}
            <div className="flex gap-2 flex-wrap mb-2">
              {/* Party/Side badge */}
              {partyDisplay && (
                <Badge className={`text-xs border ${getPartySideColor(party?.side || 'Neutral')}`}>
                  {isDeposition ? `${partyDisplay} (Depo)` : partyDisplay}
                </Badge>
              )}

              {/* Category badge */}
              {category && <Badge className="bg-slate-100 text-slate-700 text-xs">{category.name}</Badge>}

              {/* Status badge (Exhibits only) */}
              {!isDeposition && (
                <Badge className={`text-xs ${getStatusColor(proof.status)}`}>{proof.status}</Badge>
              )}

              {/* Extract pages (if this is an Extract) */}
              {proof.proof_child_type === 'Extract' && proof.extract_pages && (
                <Badge className="bg-cyan-100 text-cyan-700 text-xs font-mono">
                  Pages {compressPages(proof.extract_pages)}
                </Badge>
              )}
            </div>

            {/* Exhibit # history pills */}
            {!isDeposition && (
              <div className="flex gap-1 flex-wrap">
                {proof.draft_exhibit_num && (
                  <span className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono">
                    D: {proof.draft_exhibit_num}
                  </span>
                )}
                {proof.joint_exhibit_num && (
                  <span className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 font-mono">
                    J: {proof.joint_exhibit_num}
                  </span>
                )}
                {proof.admitted_exhibit_num && (
                  <span className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 font-mono">
                    Adm: {proof.admitted_exhibit_num}
                  </span>
                )}
                {proof.demonstrative_exhibit_num && (
                  <span className="text-[10px] px-2 py-1 rounded bg-purple-100 text-purple-700 font-mono">
                    Demo: {proof.demonstrative_exhibit_num}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            {proof.file_url || proof.video_url ? (
              <a
                href={proof.file_url || proof.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                title="View proof"
              >
                <Eye className="w-4 h-4" />
              </a>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(proof)}
              className="h-8 w-8 text-slate-600 hover:text-blue-600"
              title="Edit proof"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm('Delete this proof?')) {
                  onDelete(proof.id);
                }
              }}
              className="h-8 w-8 text-slate-600 hover:text-red-600"
              title="Delete proof"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Children accordion */}
      {expanded && children.length > 0 && (
        <div className="bg-slate-50 border-t border-slate-200">
          {children.map((child, idx) => (
            <div key={child.id} className={`px-4 py-3 ${idx !== children.length - 1 ? 'border-b border-slate-200' : ''}`}>
              <div className="flex items-start gap-3 ml-4">
                {/* Grandchild expand (if this is Extract with clips) */}
                {child.proof_child_type === 'Extract' ? (
                  <div className="w-5 shrink-0" />
                ) : null}

                {/* Child content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h4 className="font-medium text-slate-800 text-xs">{child.name}</h4>
                      {child.formal_name && child.formal_name !== child.name && (
                        <p className="text-[11px] text-slate-500 italic">{child.formal_name}</p>
                      )}
                    </div>
                    <span className="text-xs shrink-0">{getFileTypeIcon(child.file_type)}</span>
                  </div>

                  {/* Child badges */}
                  <div className="flex gap-1 flex-wrap text-[10px]">
                    {child.proof_child_type === 'Extract' && child.extract_pages && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-mono">
                        Pages {compressPages(child.extract_pages)}
                      </span>
                    )}
                    {child.proof_child_type === 'ExtractClip' && child.clipped_page && (
                      <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-mono">
                        Page {child.clipped_page}
                      </span>
                    )}
                    {child.proof_child_type === 'VideoClip' && child.video_clips?.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-mono">
                        Clip
                      </span>
                    )}
                  </div>
                </div>

                {/* Child actions */}
                <div className="flex gap-1 shrink-0">
                  {child.file_url || child.video_url ? (
                    <a
                      href={child.file_url || child.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <Eye className="w-3 h-3" />
                    </a>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(child)}
                    className="h-7 w-7 text-slate-600 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Delete this child proof?')) {
                        onDelete(child.id);
                      }
                    }}
                    className="h-7 w-7 text-slate-600 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}