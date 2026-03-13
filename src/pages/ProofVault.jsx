import React, { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ExhibitsList from '@/components/proofVault/ExhibitsList';
import DepositionsList from '@/components/proofVault/DepositionsList';
import AddProofModal from '@/components/proofVault/AddProofModal';

export default function ProofVault() {
  const [exhibitTab, setExhibitTab] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list().catch(() => []),
  });

  const exhibits = proofs.filter((p) => p.proof_category === 'Exhibit');
  const depositions = proofs.filter((p) => p.proof_category === 'Deposition');

  const getExhibitsByStatus = (status) => {
    if (status === 'all') return exhibits;
    return exhibits.filter((e) => e.status === status);
  };

  const draftCount = exhibits.filter((e) => e.status === 'Draft').length;
  const jointCount = exhibits.filter((e) => e.status === 'Joint').length;
  const admittedCount = exhibits.filter((e) => e.status === 'Admitted').length;
  const demoCount = exhibits.filter((e) => e.status === 'Demonstrative').length;

  const handleDeleteProof = async (proof) => {
    if (!confirm(`Delete "${proof.formal_name}"?`)) return;
    try {
      await base44.entities.Proof.delete(proof.id);
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
    } catch (error) {
      alert('Failed to delete proof');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Proof Vault</h2>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Proof
          </Button>
        </div>

        <Tabs defaultValue="exhibits" className="space-y-6">
          <TabsList>
            <TabsTrigger value="exhibits">Exhibits</TabsTrigger>
            <TabsTrigger value="depositions">Depositions</TabsTrigger>
          </TabsList>

          <TabsContent value="exhibits" className="space-y-4">
            <Tabs value={exhibitTab} onValueChange={setExhibitTab}>
              <TabsList>
                <TabsTrigger value="all">All ({exhibits.length})</TabsTrigger>
                <TabsTrigger value="Draft">Draft ({draftCount})</TabsTrigger>
                <TabsTrigger value="Joint">Joint ({jointCount})</TabsTrigger>
                <TabsTrigger value="Admitted">Admitted ({admittedCount})</TabsTrigger>
                <TabsTrigger value="Demonstrative">Demo ({demoCount})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <ExhibitsList exhibits={exhibits} status="all" onDelete={handleDeleteProof} />
              </TabsContent>
              <TabsContent value="Draft">
                <ExhibitsList exhibits={getExhibitsByStatus('Draft')} status="Draft" onDelete={handleDeleteProof} />
              </TabsContent>
              <TabsContent value="Joint">
                <ExhibitsList exhibits={getExhibitsByStatus('Joint')} status="Joint" onDelete={handleDeleteProof} />
              </TabsContent>
              <TabsContent value="Admitted">
                <ExhibitsList exhibits={getExhibitsByStatus('Admitted')} status="Admitted" onDelete={handleDeleteProof} />
              </TabsContent>
              <TabsContent value="Demonstrative">
                <ExhibitsList exhibits={getExhibitsByStatus('Demonstrative')} status="Demonstrative" onDelete={handleDeleteProof} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="depositions">
            <DepositionsList depositions={depositions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}