import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Film, AlertCircle, Upload, Printer, Search } from 'lucide-react';
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
import AddToJointModal from '@/components/proofVault/AddToJointModal';
import BulkSelectionBar from '@/components/proofVault/BulkSelectionBar.jsx';
import SelectableProofTile from '@/components/proofVault/SelectableProofTile.jsx';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal';
import RemoveFromJointModal from '@/components/proofVault/RemoveFromJointModal';
import CreateExtractModal from '@/components/proofVault/CreateExtractModal';
import CreateExtractClipModal from '@/components/proofVault/CreateExtractClipModal';
import CreateVideoClipModal from '@/components/proofVault/CreateVideoClipModal';
import ProofImportModal from '@/components/proofVault/ProofImportModal';
import ProofImportSourceModal from '@/components/proofVault/ProofImportSourceModal.jsx';
import DropboxBulkImportModal from '@/components/proofVault/DropboxBulkImportModal.jsx';
import PrintExhibitListModal from '@/components/proofVault/PrintExhibitListModal';
import PdfOptimizationDialog from '@/components/proofVault/PdfOptimizationDialog.jsx';
import PdfOptimizationSelectionBar from '@/components/proofVault/PdfOptimizationSelectionBar.jsx';
import ProcessingCompleteDialog from '@/components/proofVault/ProcessingCompleteDialog.jsx';
import PdfOptimizationResultDialog from '@/components/proofVault/PdfOptimizationResultDialog.jsx';
import OptimizationProgressBar from '@/components/proofVault/OptimizationProgressBar.jsx';
import { buildProcessDropboxPdfPayload, isOptimizableDropboxPdf, processDropboxPdf } from '@/lib/dropboxPdfProcessing';

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getPrimaryExhibitNumber(proof) {
  return proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || proof.draft_exhibit_num || '';
}

function shouldShowInJointTab(proof, allProofs = []) {
  if (proof.status !== 'Joint') return false;

  const isOriginalPdfParent = !proof.parent_proof_id && proof.file_type === 'PDF' && !proof.proof_child_type;
  if (isOriginalPdfParent) return false;

  if (!proof.parent_proof_id) return true;

  const parent = allProofs.find((item) => item.id === proof.parent_proof_id);
  if (!parent) return true;

  return parent.status !== 'Joint';
}

function proofMatchesSearch(proof, searchQuery) {
  const searchValue = normalizeSearchValue(searchQuery);
  if (!searchValue) return true;

  return [
    proof.name,
    proof.formal_name,
    proof.description,
    proof.dropbox_file_name,
    proof.draft_exhibit_num,
    proof.joint_exhibit_num,
    proof.admitted_exhibit_num,
    proof.demonstrative_exhibit_num,
  ].some((value) => normalizeSearchValue(value).includes(searchValue));
}

function sortProofsByExhibitNumber(items = []) {
  return [...items].sort((a, b) => {
    const aExhibit = getPrimaryExhibitNumber(a);
    const bExhibit = getPrimaryExhibitNumber(b);

    if (aExhibit && bExhibit) {
      return aExhibit.localeCompare(bExhibit, undefined, { numeric: true, sensitivity: 'base' });
    }

    if (aExhibit) return -1;
    if (bExhibit) return 1;

    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
  });
}

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
  const [showCreateVideoClipModal, setShowCreateVideoClipModal] = useState(false);
  const [selectedProofForModal, setSelectedProofForModal] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportSourceModal, setShowImportSourceModal] = useState(false);
  const [showDropboxBulkImportModal, setShowDropboxBulkImportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [expandedProofId, setExpandedProofId] = useState(null);
  const [highlightedChildId, setHighlightedChildId] = useState(null);
  const [selectedProofIds, setSelectedProofIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkOptimizing, setIsBulkOptimizing] = useState(false);
  const [showBulkOptimizationDialog, setShowBulkOptimizationDialog] = useState(false);
  const [bulkOptimizeProgress, setBulkOptimizeProgress] = useState({ value: 0, label: '' });
  const [processingSummary, setProcessingSummary] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState([]);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isRetryingOptimization, setIsRetryingOptimization] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [isProgressBarMinimized, setIsProgressBarMinimized] = useState(false);
  const [isOptimizationPaused, setIsOptimizationPaused] = useState(false);

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
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
    onError: (error) => {
      alert(`Could not update proof: ${error.message}`);
    },
  });

  const deleteProofById = async (id) => {
    const children = proofs.filter((p) => p.parent_proof_id === id);

    if (children.length > 0) {
      throw new Error(`This proof has ${children.length} child proofs. Delete all children first.`);
    }

    const questions = await base44.entities.Question.list();
    const attached = questions.filter((q) => {
      const proofIds = Array.isArray(q.proof_ids)
        ? q.proof_ids
        : Array.isArray(q.proof_ids?.ids)
          ? q.proof_ids.ids
          : [];
      return proofIds.includes(id);
    });

    if (attached.length > 0) {
      throw new Error('Remove this proof from all Questions first.');
    }

    const response = await base44.functions.invoke('deleteProofWithDropboxCleanup', { proofId: id });
    return response.data;
  };

  const deleteMutation = useMutation({
    mutationFn: deleteProofById,
    onMutate: (id) => {
      queryClient.setQueryData(['proofs'], (old = []) => old.filter((p) => p.id !== id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofs'] }),
    onError: (error, id) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
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
    if (proof.proof_child_type === 'VideoClip') {
      setSelectedProofForModal(proof);
      setShowCreateVideoClipModal(true);
      return;
    }

    if (proof.proof_child_type === 'ExtractClip') {
      setSelectedProofForModal(proof);
      setShowCreateExtractClipModal(true);
      return;
    }

    if (proof.proof_child_type === 'Extract') {
      setSelectedProofForModal(proof);
      setShowCreateExtractModal(true);
      return;
    }

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
    // Extract clip for PDF/Extract, Video clip for Video/Deposition
    if (proof.file_type === 'PDF' || proof.proof_child_type === 'Extract') {
      setShowCreateExtractClipModal(true);
    } else if (proof.file_type === 'Video' || proof.file_type === 'VideoClip') {
      setShowCreateVideoClipModal(true);
    }
  };

  const handleChildCreated = (createdProof) => {
    if (!createdProof) return;
    // Small delay to let the query cache refresh before expanding
    setTimeout(() => {
      setExpandedProofId(createdProof.parent_proof_id || null);
      setHighlightedChildId(createdProof.id);
    }, 400);
  };

  useEffect(() => {
    if (!highlightedChildId) return;
    const timeout = setTimeout(() => setHighlightedChildId(null), 3500);
    return () => clearTimeout(timeout);
  }, [highlightedChildId]);

  useEffect(() => {
    setSelectedProofIds([]);
  }, [activeTab, exhibitFilter, searchQuery]);

  // Separate exhibits and depositions (include ALL records)
  const allExhibits = proofs.filter((p) => p.proof_category === 'Exhibit');
  const allDepositions = proofs.filter((p) => p.proof_category === 'Deposition');

  // Primary lists stay top-level for All / Draft views
  const exhibitsTopLevel = allExhibits.filter((p) => !p.parent_proof_id);
  const depositionsTopLevel = allDepositions.filter((p) => !p.parent_proof_id);
  const jointRootExhibits = allExhibits.filter((proof) => {
    if (proof.status !== 'Joint') return false;
    if (proof.parent_proof_id) {
      const parent = allExhibits.find((item) => item.id === proof.parent_proof_id);
      return !parent || parent.status !== 'Joint';
    }
    return !(proof.file_type === 'PDF' && !proof.proof_child_type);
  });

  const filteredExhibits = useMemo(() => {
    const exhibitsByStatus = exhibitFilter === 'all'
      ? exhibitsTopLevel
      : exhibitFilter === 'Joint'
        ? jointRootExhibits
        : exhibitFilter === 'Admitted'
          ? allExhibits.filter((proof) => proof.status === 'Admitted')
          : exhibitFilter === 'Demonstrative'
            ? allExhibits.filter((proof) => proof.status === 'Demonstrative')
            : exhibitsTopLevel.filter((proof) => proof.status === exhibitFilter);

    return sortProofsByExhibitNumber(exhibitsByStatus.filter((proof) => proofMatchesSearch(proof, searchQuery)));
  }, [allExhibits, exhibitFilter, exhibitsTopLevel, jointRootExhibits, searchQuery]);

  const filteredDepositions = useMemo(
    () => sortProofsByExhibitNumber(depositionsTopLevel.filter((proof) => proofMatchesSearch(proof, searchQuery))),
    [depositionsTopLevel, searchQuery]
  );

  const getExhibitCount = (status) => {
    if (status === 'all') return exhibitsTopLevel.length;
    if (status === 'Joint') return jointRootExhibits.length;
    if (status === 'Admitted') return allExhibits.filter((proof) => proof.status === 'Admitted').length;
    if (status === 'Demonstrative') return allExhibits.filter((proof) => proof.status === 'Demonstrative').length;
    return exhibitsTopLevel.filter((proof) => proof.status === status).length;
  };

  const visibleProofs = activeTab === 'exhibits' ? filteredExhibits : filteredDepositions;
  const eligibleSelectedProofs = useMemo(
    () => proofs.filter((proof) => selectedProofIds.includes(proof.id) && isOptimizableDropboxPdf(proof)),
    [proofs, selectedProofIds]
  );

  const toggleProofSelection = (proofId) => {
    setSelectedProofIds((current) => (
      current.includes(proofId)
        ? current.filter((id) => id !== proofId)
        : [...current, proofId]
    ));
  };

  const handleSelectAllVisible = () => {
    setSelectedProofIds(visibleProofs.map((proof) => proof.id));
  };

  const handleClearSelection = () => {
    setSelectedProofIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedProofIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedProofIds.length} selected proof${selectedProofIds.length === 1 ? '' : 's'}?`)) return;

    setIsBulkDeleting(true);
    const failures = [];

    for (const proofId of selectedProofIds) {
      try {
        await deleteProofById(proofId);
      } catch (error) {
        failures.push(error.message);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['proofs'] });
    const deletedCount = selectedProofIds.length - failures.length;
    setSelectedProofIds([]);
    setIsBulkDeleting(false);

    if (failures.length > 0) {
      alert(`${deletedCount} deleted, ${failures.length} failed.\n\n${failures.join('\n')}`);
    }
  };

  const handleBulkOptimize = async (options, proofsToProcess = null) => {
    const targetProofs = proofsToProcess || eligibleSelectedProofs;
    if (targetProofs.length === 0) return;

    setIsBulkOptimizing(true);
    setIsOptimizationPaused(false);
    setBulkOptimizeProgress({
      value: 5,
      label: `Starting ${targetProofs.length} PDF${targetProofs.length === 1 ? '' : 's'}...`,
    });

    const results = [];
    let shouldStop = false;

    for (let index = 0; index < targetProofs.length; index += 1) {
      if (shouldStop) break;

      // Wait while paused
      while (isOptimizationPaused && !shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const proof = targetProofs[index];
      setBulkOptimizeProgress({
        value: Math.max(8, (index / targetProofs.length) * 100),
        label: `Processing ${proof.name} (${index + 1} of ${targetProofs.length})...`,
      });

      try {
        const processedData = await processDropboxPdf(
          buildProcessDropboxPdfPayload({ proof, options })
        );
        await base44.entities.Proof.update(proof.id, {
          file_source: 'dropbox',
          file_url: '',
          video_url: '',
          ...processedData,
        });
        results.push({
          proofId: proof.id,
          proofName: proof.name || proof.formal_name,
          success: true,
          optimized_with_cover_page: processedData.optimized_with_cover_page,
          optimized_with_page_numbers: processedData.optimized_with_page_numbers,
        });
      } catch (error) {
        results.push({
          proofId: proof.id,
          proofName: proof.name || proof.formal_name,
          success: false,
          error: error.message || 'Unknown error occurred',
        });
      }

      setBulkOptimizeProgress({
        value: ((index + 1) / targetProofs.length) * 100,
        label: `Finished ${index + 1} of ${targetProofs.length}`,
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['proofs'] });
    setIsBulkOptimizing(false);
    setIsOptimizationPaused(false);
    setBulkOptimizeProgress({ value: 100, label: shouldStop ? 'Stopped' : 'Done' });
    setShowBulkOptimizationDialog(false);
    setShowProgressBar(false);
    setIsProgressBarMinimized(false);

    // Only clear selection if this was the initial optimization
    if (!proofsToProcess) {
      setSelectedProofIds([]);
    }

    setOptimizationResults(results);
    if (!shouldStop) {
      setShowResultDialog(true);
    }
  };

  const handleRetryAllFailed = async () => {
    const failedProofs = optimizationResults
      .filter((r) => !r.success)
      .map((r) => proofs.find((p) => p.id === r.proofId))
      .filter(Boolean);

    if (failedProofs.length === 0) return;

    setIsRetryingOptimization(true);
    setShowResultDialog(false);
    setShowProgressBar(true);
    setIsProgressBarMinimized(false);
    const options = {
      addCoverPage: true,
      addPageNumbers: true,
      optimizePdf: true,
    };

    await handleBulkOptimize(options, failedProofs);
    setIsRetryingOptimization(false);
  };

  const handleRetrySelected = async (selectedProofIds) => {
    const selectedProofs = selectedProofIds
      .map((id) => proofs.find((p) => p.id === id))
      .filter(Boolean);

    if (selectedProofs.length === 0) return;

    setIsRetryingOptimization(true);
    setShowResultDialog(false);
    setShowProgressBar(true);
    setIsProgressBarMinimized(false);
    const options = {
      addCoverPage: true,
      addPageNumbers: true,
      optimizePdf: true,
    };

    await handleBulkOptimize(options, selectedProofs);
    setIsRetryingOptimization(false);
  };

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPrintModal(true)} className="gap-2">
              <Printer className="w-4 h-4" /> Print List
            </Button>
            <Button variant="outline" onClick={() => setShowImportSourceModal(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Proof
            </Button>
          </div>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
          onSuccess={handleChildCreated}
        />

        <CreateExtractClipModal
          open={showCreateExtractClipModal}
          onClose={() => setShowCreateExtractClipModal(false)}
          parentExtract={selectedProofForModal}
          onSuccess={handleChildCreated}
        />

        <PrintExhibitListModal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          proofs={proofs}
        />

        <ProofImportSourceModal
          open={showImportSourceModal}
          onClose={() => setShowImportSourceModal(false)}
          onSelectExcel={() => {
            setShowImportSourceModal(false);
            setShowImportModal(true);
          }}
          onSelectDropbox={() => {
            setShowImportSourceModal(false);
            setShowDropboxBulkImportModal(true);
          }}
        />

        <ProofImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['proofs'] })}
        />

        <DropboxBulkImportModal
          open={showDropboxBulkImportModal}
          onClose={() => setShowDropboxBulkImportModal(false)}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['proofs'] })}
          onEditImported={(proof) => {
            setShowDropboxBulkImportModal(false);
            handleEdit(proof);
          }}
        />

        <CreateVideoClipModal
          open={showCreateVideoClipModal}
          onClose={() => setShowCreateVideoClipModal(false)}
          parentProof={selectedProofForModal}
          onSuccess={handleChildCreated}
        />

        <PdfOptimizationDialog
          open={showBulkOptimizationDialog}
          onOpenChange={(open) => {
            setShowBulkOptimizationDialog(open);
            if (!open && !isBulkOptimizing) setBulkOptimizeProgress({ value: 0, label: '' });
          }}
          title="Optimize selected Dropbox PDFs"
          description="Each selected proof will get a new processed Dropbox copy saved to your Dropbox save folder, and the proof will start using that new file. Optimization will run in the background."
          confirmLabel="Start optimization"
          isSubmitting={isBulkOptimizing}
          progressValue={bulkOptimizeProgress.value}
          progressLabel={bulkOptimizeProgress.label}
          onSubmit={(options) => {
            setShowBulkOptimizationDialog(false);
            setShowProgressBar(true);
            setIsProgressBarMinimized(false);
            // Run optimization in background without awaiting
            handleBulkOptimize(options);
          }}
        />

        <ProcessingCompleteDialog
          open={Boolean(processingSummary)}
          onOpenChange={(open) => !open && setProcessingSummary(null)}
          title={processingSummary?.title}
          message={processingSummary?.message}
          fileNames={processingSummary?.fileNames || []}
          folderUrl={processingSummary?.folderUrl}
          folderPath={processingSummary?.folderPath}
        />

        <PdfOptimizationResultDialog
          open={showResultDialog}
          onOpenChange={setShowResultDialog}
          results={optimizationResults}
          onRetryAll={handleRetryAllFailed}
          onRetrySelected={handleRetrySelected}
          isRetrying={isRetryingOptimization}
        />

        <OptimizationProgressBar
          isVisible={showProgressBar && isBulkOptimizing}
          isMinimized={isProgressBarMinimized}
          onToggleMinimize={() => setIsProgressBarMinimized(!isProgressBarMinimized)}
          onClose={() => setShowProgressBar(false)}
          progressValue={bulkOptimizeProgress.value}
          progressLabel={bulkOptimizeProgress.label}
          isPaused={isOptimizationPaused}
          onPauseToggle={() => setIsOptimizationPaused(!isOptimizationPaused)}
          onStop={() => {
            setIsBulkOptimizing(false);
            setIsOptimizationPaused(false);
            setBulkOptimizeProgress({ value: 0, label: '' });
            setShowProgressBar(false);
          }}
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
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search proofs by name, filename, description, or exhibit #"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
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
                      {status === 'all' ? 'All' : status} ({getExhibitCount(status)})
                    </Button>
                  ))}
                </div>
                <BulkSelectionBar
                  selectedCount={selectedProofIds.length}
                  visibleCount={filteredExhibits.length}
                  isDeleting={isBulkDeleting}
                  onSelectAll={handleSelectAllVisible}
                  onClear={handleClearSelection}
                  onDelete={handleBulkDelete}
                />
                <PdfOptimizationSelectionBar
                  selectedCount={selectedProofIds.length}
                  eligibleCount={eligibleSelectedProofs.length}
                  isProcessing={isBulkOptimizing}
                  onOptimize={() => setShowBulkOptimizationDialog(true)}
                />
                {filteredExhibits.length === 0 ? (
                   renderEmptyState(searchQuery ? 'No exhibits match your search.' : 'No exhibits in this category.')
                 ) : (
                   <div className="space-y-3">
                     {filteredExhibits.map((proof) => (
                       <SelectableProofTile
                         key={proof.id}
                         proof={proof}
                         checked={selectedProofIds.includes(proof.id)}
                         disabled={isBulkDeleting}
                         onCheckedChange={toggleProofSelection}
                         allProofs={allExhibits}
                         parties={parties}
                         categories={categories}
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
                         expandedProofId={expandedProofId}
                         highlightedChildId={highlightedChildId}
                       />
                     ))}
                   </div>
                )}
              </TabsContent>

              <TabsContent value="depositions" className="mt-0">
                <BulkSelectionBar
                  selectedCount={selectedProofIds.length}
                  visibleCount={filteredDepositions.length}
                  isDeleting={isBulkDeleting}
                  onSelectAll={handleSelectAllVisible}
                  onClear={handleClearSelection}
                  onDelete={handleBulkDelete}
                />
                <PdfOptimizationSelectionBar
                  selectedCount={selectedProofIds.length}
                  eligibleCount={eligibleSelectedProofs.length}
                  isProcessing={isBulkOptimizing}
                  onOptimize={() => setShowBulkOptimizationDialog(true)}
                />
                {filteredDepositions.length === 0 ? (
                  renderEmptyState(searchQuery ? 'No depositions match your search.' : 'No depositions added yet.')
                ) : (
                  <div className="space-y-3">
                    {filteredDepositions.map((proof) => (
                      <SelectableProofTile
                        key={proof.id}
                        proof={proof}
                        checked={selectedProofIds.includes(proof.id)}
                        disabled={isBulkDeleting}
                        onCheckedChange={toggleProofSelection}
                        allProofs={allDepositions}
                        parties={parties}
                        categories={categories}
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
                        expandedProofId={expandedProofId}
                        highlightedChildId={highlightedChildId}
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