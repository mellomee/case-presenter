import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Eye, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ProofCard({ proof, onEdit, onDelete }) {
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

  // Status colors
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

  // Exhibit # history pills
  const renderExhibitHistory = () => {
    const pills = [];
    if (proof.draft_exhibit_num) {
      pills.push(
        <span key="draft" className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
          D: {proof.draft_exhibit_num}
        </span>
      );
    } else if (proof.status === 'Draft') {
      pills.push(
        <span key="draft" className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
          D: —
        </span>
      );
    }

    if (proof.joint_exhibit_num) {
      pills.push(
        <span key="joint" className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
          J: {proof.joint_exhibit_num}
        </span>
      );
    } else if (proof.status !== 'Draft') {
      pills.push(
        <span key="joint" className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
          J: —
        </span>
      );
    }

    if (proof.admitted_exhibit_num) {
      pills.push(
        <span key="admitted" className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
          Adm: {proof.admitted_exhibit_num}
        </span>
      );
    } else if (proof.demonstrative_exhibit_num) {
      pills.push(
        <span key="demo" className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
          Demo: {proof.demonstrative_exhibit_num}
        </span>
      );
    }

    return pills.length > 0 ? pills : null;
  };

  // File type icon & label
  const getFileTypeLabel = () => {
    if (proof.file_type === 'PDF') return '📄 PDF';
    if (proof.file_type === 'Image') return '🖼️ Image';
    if (proof.file_type === 'Video') return '🎥 Video';
    return 'File';
  };

  // Deposition badge
  const isDeposition = proof.proof_category === 'Deposition';
  const partyDisplay = party ? `${party.first_name} ${party.last_name}` : null;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-slate-200">
      {/* Header: Name + Type Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">{proof.name}</h3>
          {proof.formal_name && (
            <p className="text-xs text-slate-500 mt-0.5 italic">{proof.formal_name}</p>
          )}
        </div>
        <Badge variant="outline" className="text-xs ml-2 whitespace-nowrap">
          {getFileTypeLabel()}
        </Badge>
      </div>

      {/* Description */}
      {proof.description && (
        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{proof.description}</p>
      )}

      {/* Category & Party badges */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {category && (
          <Badge className="bg-slate-100 text-slate-700 text-xs">{category.name}</Badge>
        )}
        {isDeposition && partyDisplay && (
          <Badge className="bg-amber-100 text-amber-700 text-xs">
            Depo: {partyDisplay}
          </Badge>
        )}
        {!isDeposition && partyDisplay && (
          <Badge className="bg-slate-100 text-slate-700 text-xs">{partyDisplay}</Badge>
        )}
      </div>

      {/* Exhibit # History Pills */}
      {renderExhibitHistory() && !isDeposition && (
        <div className="flex gap-1 mb-3 flex-wrap">{renderExhibitHistory()}</div>
      )}

      {/* Status Pill */}
      {!isDeposition && (
        <div className="mb-3">
          <Badge className={`text-xs ${getStatusColor(proof.status)}`}>
            {proof.status}
          </Badge>
        </div>
      )}

      {/* Divider & Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <div className="flex gap-1">
          {proof.file_url || proof.video_url ? (
            <>
              {proof.file_url && (
                <a
                  href={proof.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs h-8 px-2 rounded hover:bg-blue-50"
                  title="View file"
                >
                  <Eye className="w-3 h-3" />
                  View
                </a>
              )}
              {proof.video_url && (
                <a
                  href={proof.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs h-8 px-2 rounded hover:bg-blue-50"
                  title="Open video"
                >
                  <Eye className="w-3 h-3" />
                  Open
                </a>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">No file</span>
          )}
        </div>

        {/* Edit / Delete buttons */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(proof)}
            className="h-7 w-7 text-slate-600 hover:text-blue-600"
            title="Edit proof"
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('Delete this proof?')) {
                onDelete(proof.id);
              }
            }}
            className="h-7 w-7 text-slate-600 hover:text-red-600"
            title="Delete proof"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}