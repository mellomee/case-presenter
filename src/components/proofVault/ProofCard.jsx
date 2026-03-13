import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProofActions from './ProofActions';

export default function ProofCard({ proof, tabLocation, onEdit }) {
  const { data: proofType } = useQuery({
    queryKey: ['proofType', proof.proof_type_id],
    queryFn: () =>
      proof.proof_type_id ? base44.entities.ProofTypeCategory.list().then((types) => types.find((t) => t.id === proof.proof_type_id)) : null,
    enabled: !!proof.proof_type_id,
  });

  const { data: category } = useQuery({
    queryKey: ['category', proof.category_id],
    queryFn: () =>
      proof.category_id ? base44.entities.Category.list().then((cats) => cats.find((c) => c.id === proof.category_id)) : null,
    enabled: !!proof.category_id,
  });

  const hasFile = !!proof.file_url;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">{proof.title}</h3>
          {proof.exhibit_number && (
            <p className="text-xs text-slate-500 mt-1">Exhibit: {proof.exhibit_number}</p>
          )}
        </div>
        {proofType && <Badge variant="outline" className="text-xs ml-2">{proofType.name}</Badge>}
      </div>

      {proof.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{proof.description}</p>
      )}

      {category && <Badge className="bg-blue-100 text-blue-800 text-xs mb-3">{category.name}</Badge>}

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        {hasFile ? (
          <a
            href={proof.file_url || proof.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
          >
            <Download className="w-3 h-3" />
            View
          </a>
        ) : (
          <span className="text-xs text-slate-400">No file</span>
        )}

        <ProofActions proof={proof} tabLocation={tabLocation} onEdit={onEdit} />
      </div>
    </Card>
  );
}