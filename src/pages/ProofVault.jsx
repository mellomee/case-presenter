import React, { useState } from 'react';
import { FileText, Plus, Film, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ProofForm from '@/components/proofVault/ProofForm';
import ProofTile from '@/components/proofVault/ProofTile';
import AddToJointModal from '@/components/proofVault/AddToJointModal';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal';
import RemoveFromJointModal from '@/components/proofVault/RemoveFromJointModal';
import CreateExtractModal from '@/components/proofVault/CreateExtractModal';
import CreateExtractClipModal from '@/components/proofVault/CreateExtractClipModal';
import CreateVideoClipModal from '@/components/proofVault/CreateVideoClipModal';

export default function ProofVault() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProof, setEditingProof] = useState(null);
  const [activeTab, setActiveTab] = useState('exhibits');
  const [exhibitFilter, setExhibitFilter] = useState('all');
  const [showAddToJointModal, setShowAddToJointModal] = useState(false);
  const [showAdmitExhibitModal, setShowAdmitExhibitModal] = useState(false);
  const [showAdmitDemoModal, setShowAdmitDemoModal] = useState(false);
  const [showUnAdmitModal, setShowUnAdmitModal] = useState(false);
  const [showRemoveFromJointModal, setShowRemoveFromJointModal] = useState(false);
  const [showCreateExtractModal, setShowCreateExtractModal] = useState(false);
  const [showCreateExtractClipModal, setShowCreateExtractClipModal] = useState(false);
  const [selectedProofForModal, setSelectedProofForModal] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Proof.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proof.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setEditingProof(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const proof = proofs.find((p) => p.id === id);
      const children = proofs.filter((p) => p.parent_proof_id === id);
      
      if (children.length > 0) {
        throw new Error(`This proof has ${children.length} child proofs. Delete all children first.`);
      }

      const questions = await base44.entities.Question.list();
      const attached = questions.filter((q) => {
        const proofIds = Array.isArray(q.proof_ids) ? q.proof_ids : [];
        return proofIds.includes(id);
      });

      if (attached.length > 0) {
        throw new Error('Remove this proof from all Questions first.');
      }

      return base44.entities.Proof.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofs'] }),
    onError: (error) => {
      alert(`Cannot delete: ${error.message}`);
    },
  });

  const handleSubmit = (formData) => {
    if (editingProof) {
      updateMutation.mutate({ id: editingProof.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (proof) => {
    setEditingProof(proof);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingProof(null);
    setShowForm(false);
  };

  // Status workflow modal handlers
  const handleAddToJoint = (proof) => {
    setSelectedProofForModal(proof);
    setShowAddToJointModal(true);
  };

  const handleAdmitAsExhibit = (proof) => {
    setSelectedProofForModal(proof);
    setShowAdmitExhibitModal(true);
  };

  const handleAdmitAsDemonstrative = (proof) => {
    setSelectedProofForModal(proof);
    setShowAdmitDemoModal(true);
  };

  // Demotion modal handlers
  const handleUnAdmit = (proof) => {
    setSelectedProofForModal(proof);
    setShowUnAdmitModal(true);
  };

  const handleRemoveFromJoint = (proof) => {
    setSelectedProofForModal(proof);
    setShowRemoveFromJointModal(true);
  };

  // Extract and clip handlers
  const handleExtract = (proof) => {
    setSelectedProofForModal(proof);
    setShowCreateExtractModal(true);
  };

  const handleClip = (proof) => {
    setSelectedProofForModal(proof);
    setShowCreateExtractClipModal(true);
  };

  // Separate exhibits and depositions
  const exhibits = proofs.filter((p) => p.proof_category === 'Exhibit' && !p.parent_proof_id);
  const depositions = proofs.filter((p) => p.proof_category === 'Deposition' && !p.parent_proof_id);

  // Filter exhibits by status
  const filteredExhibits = exhibitFilter === 'all' 
    ? exhibits 
    : exhibits.filter((e) => e.status === exhibitFilter);

  const renderEmptyState = (title) => (
    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
      <p className="text-slate-600">{title}</p>
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Proof Vault</h2>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Proof
          </Button>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProof ? 'Edit Proof' : 'Add Proof'}</DialogTitle>
            </DialogHeader>
            <ProofForm proof={editingProof} onSubmit={handleSubmit} onCancel={handleCancel} />
          </DialogContent>
        </Dialog>

        <AddToJointModal
          open={showAddToJointModal}
          onClose={() => setShowAddToJointModal(false)}
          proof={selectedProofForModal}
        />

        <AdmitAsExhibitModal
          open={showAdmitExhibitModal}
          onClose={() => setShowAdmitExhibitModal(false)}
          proof={selectedProofForModal}
        />

        <AdmitAsDemonstrativeModal
          open={showAdmitDemoModal}
          onClose={() => setShowAdmitDemoModal(false)}
          proof={selectedProofForModal}
        />

        <UnAdmitModal
          open={showUnAdmitModal}
          onClose={() => setShowUnAdmitModal(false)}
          proof={selectedProofForModal}
        />

        <RemoveFromJointModal
          open={showRemoveFromJointModal}
          onClose={() => setShowRemoveFromJointModal(false)}
          proof={selectedProofForModal}
        />

        <CreateExtractModal
          open={showCreateExtractModal}
          onClose={() => setShowCreateExtractModal(false)}
          parentProof={selectedProofForModal}
        />

        <CreateExtractClipModal
          open={showCreateExtractClipModal}
          onClose={() => setShowCreateExtractClipModal(false)}
          parentExtract={selectedProofForModal}
        />

        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">
                {warningMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0 h-auto">
              <TabsTrigger value="exhibits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4 gap-2">
                <FileText className="w-4 h-4" /> Exhibits
              </TabsTrigger>
              <TabsTrigger value="depositions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4 gap-2">
                <Film className="w-4 h-4" /> Depositions
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="exhibits" className="mt-0">
                <div className="mb-4 flex gap-2 flex-wrap">
                  {['all', 'Draft', 'Joint', 'Admitted', 'Demonstrative'].map((status) => (
                    <Button
                      key={status}
                      variant={exhibitFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExhibitFilter(status)}
                      className={exhibitFilter === status ? 'bg-blue-600' : ''}
                    >
                      {status === 'all' ? 'All' : status} ({exhibits.filter((e) => exhibitFilter === 'all' || e.status === status).length})
                    </Button>
                  ))}
                </div>
                {filteredExhibits.length === 0 ? (
                  renderEmptyState('No exhibits in this category.')
                ) : (
                  <div className="space-y-3">
                    {filteredExhibits.filter((p) => !p.parent_proof_id).map((proof) => (
                      <ProofTile
                        key={proof.id}
                        proof={proof}
                        allProofs={filteredExhibits}
                        currentTab={exhibitFilter}
                        onEdit={handleEdit}
                        onDelete={deleteMutation.mutate}
                        onExtract={handleExtract}
                        onClip={handleClip}
                        onAddToJoint={handleAddToJoint}
                        onAdmitAsExhibit={handleAdmitAsExhibit}
                        onAdmitAsDemonstrative={handleAdmitAsDemonstrative}
                        onRemoveFromJoint={handleRemoveFromJoint}
                        onUnAdmit={handleUnAdmit}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="depositions" className="mt-0">
                {depositions.length === 0 ? (
                  renderEmptyState('No depositions added yet.')
                ) : (
                  <div className="space-y-3">
                    {depositions.filter((p) => !p.parent_proof_id).map((proof) => (
                      <ProofTile
                        key={proof.id}
                        proof={proof}
                        allProofs={depositions}
                        currentTab="depositions"
                        onEdit={handleEdit}
                        onDelete={deleteMutation.mutate}
                        onExtract={handleExtract}
                        onClip={handleClip}
                        onAddToJoint={handleAddToJoint}
                        onAdmitAsExhibit={handleAdmitAsExhibit}
                        onAdmitAsDemonstrative={handleAdmitAsDemonstrative}
                        onRemoveFromJoint={handleRemoveFromJoint}
                        onUnAdmit={handleUnAdmit}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}