import React from 'react';
import PrintableProofAttachment from '@/components/examV2/PrintableProofAttachment.jsx';
import { parseIdsField } from '@/lib/examV2Utils';

export default function PrintableQuestionTree({ items = [], parentId = null, proofsById = {}, depth = 0 }) {
  const children = items
    .filter((item) => (item.parent_item_id || null) === parentId && item.item_type === 'question')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (children.length === 0) return null;

  return (
    <div className="space-y-4" style={{ marginLeft: depth * 24 }}>
      {children.map((item) => {
        const attachedProofs = parseIdsField(item.attached_proof_ids).map((id) => proofsById[id]).filter(Boolean);

        return (
          <div key={item.id} className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-4 w-4 flex-shrink-0 rounded-sm border border-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-6 text-slate-900">{item.text}</p>
                {item.expected_answer && <p className="mt-2 text-sm text-emerald-700"><span className="font-semibold">Expected:</span> {item.expected_answer}</p>}
                {item.notes && <p className="mt-1 text-sm text-amber-700"><span className="font-semibold">Notes:</span> {item.notes}</p>}
              </div>
            </div>

            {attachedProofs.length > 0 && (
              <div className="ml-7 grid gap-3 md:grid-cols-2">
                {attachedProofs.map((proof) => <PrintableProofAttachment key={proof.id} proof={proof} proofsById={proofsById} />)}
              </div>
            )}

            <PrintableQuestionTree items={items} parentId={item.id} proofsById={proofsById} depth={depth + 1} />
          </div>
        );
      })}
    </div>
  );
}