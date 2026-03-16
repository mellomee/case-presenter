import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

function ProofItem({ proof, selected, onToggle }) {
  return (
    <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(proof.id)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 leading-snug">{proof.name}</p>
        {proof.formal_name && <p className="text-xs text-slate-500 mt-0.5">Formal Name: {proof.formal_name}</p>}
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {proof.joint_exhibit_num && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">J: {proof.joint_exhibit_num}</span>
          )}
          {proof.admitted_exhibit_num && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-mono">Adm: {proof.admitted_exhibit_num}</span>
          )}
          {proof.demonstrative_exhibit_num && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">Demo: {proof.demonstrative_exhibit_num}</span>
          )}
          <span className="text-xs text-slate-400">{proof.file_type}</span>
        </div>
      </div>
    </label>
  );
}

export default function ProofPicker({ selectedProofIds = [], onToggle }) {
  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const jointExhibits = proofs.filter(p => p.proof_category === 'Exhibit' && p.status === 'Joint');
  const depositions = proofs.filter(p => p.proof_category === 'Deposition');
  const demonstratives = proofs.filter(p => p.proof_category === 'Exhibit' && p.status === 'Demonstrative');

  const renderList = (items) => {
    if (items.length === 0) {
      return <p className="text-sm text-slate-500 italic py-4 text-center">No items available</p>;
    }
    return (
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {items.map(proof => (
          <ProofItem
            key={proof.id}
            proof={proof}
            selected={selectedProofIds.includes(proof.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-2 block">Attach Proofs</label>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <Tabs defaultValue="joint">
          <TabsList className="w-full rounded-none border-b border-slate-200 h-auto p-0 bg-slate-50">
            <TabsTrigger value="joint" className="flex-1 rounded-none text-xs py-2.5 data-[state=active]:bg-white">
              Joint Exhibits ({jointExhibits.length})
            </TabsTrigger>
            <TabsTrigger value="depositions" className="flex-1 rounded-none text-xs py-2.5 data-[state=active]:bg-white">
              Depositions ({depositions.length})
            </TabsTrigger>
            <TabsTrigger value="demonstratives" className="flex-1 rounded-none text-xs py-2.5 data-[state=active]:bg-white">
              Demonstratives ({demonstratives.length})
            </TabsTrigger>
          </TabsList>
          <div className="p-3 bg-white">
            <TabsContent value="joint" className="mt-0">{renderList(jointExhibits)}</TabsContent>
            <TabsContent value="depositions" className="mt-0">{renderList(depositions)}</TabsContent>
            <TabsContent value="demonstratives" className="mt-0">{renderList(demonstratives)}</TabsContent>
          </div>
        </Tabs>
      </div>
      {selectedProofIds.length > 0 && (
        <p className="text-xs text-blue-600 mt-1.5 font-medium">
          {selectedProofIds.length} proof{selectedProofIds.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}