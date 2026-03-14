import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, FileCheck } from 'lucide-react';

export default function AdmissionBlockList({ blocks, proofs = [], proofTypeCategories = [], onEdit, onDelete }) {
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2">
      {blocks.map(block => {
        const proof = proofs.find(p => p.id === block.proof_id);
        const category = proofTypeCategories.find(c => c.id === block.proof_type_category_id);
        const overrideCount = Object.keys(block.step_overrides || {}).length;
        const exhibitNum = proof?.joint_exhibit_num || proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num;

        return (
          <div key={block.id} className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/40">
            <FileCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800">
                  {proof?.formal_name || proof?.name || 'Unknown Proof'}
                </p>
                {exhibitNum && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">{exhibitNum}</span>
                )}
                {category && (
                  <Badge className="bg-slate-100 text-slate-600 text-xs">{category.name}</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Admission Block · 10 steps
                {overrideCount > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">✏️ {overrideCount} customised</span>
                )}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => onEdit(block)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDelete(block)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}