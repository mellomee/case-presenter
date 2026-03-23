import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';
import { getNearestJointExhibitNumber, getProofHierarchyLabel, getProofStatusLabel, getProofStatusTone } from '@/lib/proofStatusUtils';

function ProofRow({ proof, proofsById, isRoot = false, onPreview, onSelect }) {
  const hierarchyLabel = getProofHierarchyLabel(proof, proofsById);
  const jointNumber = getNearestJointExhibitNumber(proof, proofsById);

  return (
    <div className={`flex items-start gap-3 rounded-xl ${isRoot ? '' : 'border border-slate-200 bg-slate-50 p-3'}`}>
      <div className="flex-shrink-0">
        <ExamBuilderProofThumb proof={proof} size={isRoot ? 'md' : 'sm'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getProofStatusTone(proof)}`}>
            {getProofStatusLabel(proof)}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {hierarchyLabel}
          </span>
          {jointNumber && <span className="text-xs text-slate-500">Joint # {jointNumber}</span>}
          {proof.admitted_exhibit_num && <span className="text-xs text-slate-500">Admitted # {proof.admitted_exhibit_num}</span>}
          {proof.demonstrative_exhibit_num && <span className="text-xs text-slate-500">Demo # {proof.demonstrative_exhibit_num}</span>}
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
          {proof.proof_child_type && <span>{proof.proof_child_type}</span>}
          {proof.file_type && <span>{proof.file_type}</span>}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onPreview(proof)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
          title="Preview proof"
        >
          <Eye className="h-4 w-4" />
        </button>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onSelect(proof)}>
          Add to Exam
        </Button>
      </div>
    </div>
  );
}

export default function ExamBuilderProofFamilyCard({ rootProof, familyProofs = [], proofsById = {}, onPreview, onSelect }) {
  const childProofs = familyProofs.filter((proof) => proof.id !== rootProof.id);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <ProofRow proof={rootProof} proofsById={proofsById} isRoot onPreview={onPreview} onSelect={onSelect} />
      {childProofs.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="ml-3 space-y-3 border-l-2 border-slate-200 pl-4">
            {childProofs.map((proof) => (
              <ProofRow key={proof.id} proof={proof} proofsById={proofsById} onPreview={onPreview} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}