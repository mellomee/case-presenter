import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Download, FileType } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ProofCard({ proof, onEdit, onDelete }) {
  const statusColors = {
    Draft: 'bg-slate-100 text-slate-800',
    Joint: 'bg-amber-100 text-amber-800',
    Admitted: 'bg-green-100 text-green-800',
    Demonstrative: 'bg-purple-100 text-purple-800',
  };

  const getDisplayExhibit = () => {
    if (proof.admitted_exhibit_num) return proof.admitted_exhibit_num;
    if (proof.joint_exhibit_num) return proof.joint_exhibit_num;
    if (proof.demonstrative_exhibit_num) return proof.demonstrative_exhibit_num;
    if (proof.draft_exhibit_num) return proof.draft_exhibit_num;
    return null;
  };

  const hasFile = !!proof.file_url;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">{proof.formal_name || proof.name}</h3>
          {getDisplayExhibit() && (
            <p className="text-xs text-slate-500 mt-1">Exhibit: {getDisplayExhibit()}</p>
          )}
        </div>
        <Badge className={`text-xs ml-2 ${statusColors[proof.status] || statusColors.Draft}`}>
          {proof.status}
        </Badge>
      </div>

      {proof.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{proof.description}</p>
      )}

      <div className="flex gap-2 mb-3 flex-wrap">
        <Badge variant="outline" className="text-xs">{proof.file_type}</Badge>
        {proof.proof_category && <Badge variant="outline" className="text-xs">{proof.proof_category}</Badge>}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        {hasFile ? (
          <a
            href={proof.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
          >
            <Download className="w-3 h-3" />
            View File
          </a>
        ) : (
          <span className="text-xs text-slate-400">No file attached</span>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(proof)}
            className="h-7 w-7 text-slate-600 hover:text-blue-600"
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(proof.id)}
            className="h-7 w-7 text-slate-600 hover:text-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}