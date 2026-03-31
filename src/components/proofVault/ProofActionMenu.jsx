import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Pencil,
  Eye,
  Link2,
  Scissors,
  Highlighter,
  CheckCircle,
  Circle,
  Trash2,
  Copy,
  FileText,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { proofHasLinkedFile } from './proofAssetUtils';
import PdfOptimizationDialog from '@/components/proofVault/PdfOptimizationDialog.jsx';
import ProcessingCompleteDialog from '@/components/proofVault/ProcessingCompleteDialog.jsx';
import { buildProcessDropboxPdfPayload, isOptimizableDropboxPdf, processDropboxPdf } from '@/lib/dropboxPdfProcessing';

export default function ProofActionMenu({
  proof,
  currentTab,
  allProofs = [],
  onEdit,
  onView,
  onExtract,
  onClip,
  onAddToJoint,
  onAdmitAsExhibit,
  onAdmitAsDemonstrative,
  onRemoveFromJoint,
  onUnAdmit,
  onDelete,
}) {
  const [deleteError, setDeleteError] = useState(null);
  const [deleteErrorOpen, setDeleteErrorOpen] = useState(false);
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState({ value: 0, label: '' });
  const [processingSummary, setProcessingSummary] = useState(null);
  const queryClient = useQueryClient();

  const { data: childProofs = [] } = useQuery({
    queryKey: ['childProofs', proof.id],
    queryFn: () => allProofs.filter((p) => p.parent_proof_id === proof.id),
  });

  const { data: attachedQuestions = [] } = useQuery({
    queryKey: ['questionsWithProof', proof.id],
    queryFn: async () => {
      if (!proof.id) return [];
      const questions = await base44.entities.Question.list();
      return questions.filter((q) => {
        const proofIds = Array.isArray(q.proof_ids)
          ? q.proof_ids
          : Array.isArray(q.proof_ids?.ids)
            ? q.proof_ids.ids
            : [];
        return proofIds.includes(proof.id);
      });
    },
  });

  const handleDelete = () => {
    if (childProofs.length > 0) {
      setDeleteError(`This proof has ${childProofs.length} child proof${childProofs.length > 1 ? 's' : ''}. Delete all children first.`);
      setDeleteErrorOpen(true);
      return;
    }

    if (attachedQuestions.length > 0) {
      setDeleteError(`This proof is attached to ${attachedQuestions.length} question${attachedQuestions.length > 1 ? 's' : ''}. Remove from all questions first.`);
      setDeleteErrorOpen(true);
      return;
    }

    if (confirm('Are you sure you want to delete this proof?')) {
      onDelete(proof.id);
    }
  };

  const optimizeMutation = useMutation({
    mutationFn: async (options) => {
      setOptimizeProgress({ value: 15, label: `Processing ${proof.name}...` });
      const processedData = await processDropboxPdf(buildProcessDropboxPdfPayload({ proof, options }));
      setOptimizeProgress({ value: 82, label: 'Updating proof record...' });
      await base44.entities.Proof.update(proof.id, {
        file_source: 'dropbox',
        file_url: '',
        video_url: '',
        ...processedData,
      });
      return processedData;
    },
    onSuccess: (processedData) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setOptimizeProgress({ value: 100, label: 'Done' });
      setOptimizeDialogOpen(false);
      setProcessingSummary({
        title: 'PDF processing complete',
        message: 'Your processed Dropbox copy is ready.',
        fileNames: [processedData.processed_file_name || processedData.dropbox_file_name || proof.name],
        folderUrl: processedData.dropbox_folder_url,
        folderPath: processedData.dropbox_folder_path,
      });
    },
    onError: (error) => {
      setOptimizeProgress({ value: 0, label: '' });
      alert(`Could not optimize PDF: ${error.message}`);
    },
  });

  const getAvailableActions = () => {
    const normalizedTab = String(currentTab || '').toLowerCase();
    const isTopLevel = !proof.parent_proof_id;
    const isExtract = proof.proof_child_type === 'Extract';
    const isPDF = proof.file_type === 'PDF';
    const isVideo = proof.file_type === 'Video';
    const hasAttachment = proofHasLinkedFile(proof);
    const actions = [];

    actions.push({ id: 'edit', label: 'Edit', icon: Pencil, action: onEdit, color: 'text-blue-600' });

    if (hasAttachment) {
      actions.push({ id: 'view', label: 'View', icon: Eye, action: onView, color: 'text-slate-600' });
    }

    if (isPDF && isTopLevel && hasAttachment) {
      actions.push({ id: 'extract', label: 'Extract', icon: Scissors, action: onExtract, color: 'text-orange-600' });
    }

    if ((isVideo && isTopLevel && hasAttachment) || (isExtract && hasAttachment)) {
      actions.push({ id: 'clip', label: isExtract ? 'Highlight' : 'Clip', icon: isExtract ? Highlighter : Scissors, action: onClip, color: isExtract ? 'text-yellow-500' : 'text-orange-600' });
    }

    const isOriginalPdfProof = isPDF && isTopLevel && !proof.proof_child_type;
    const canOptimizePdf = isOptimizableDropboxPdf(proof);
    const canAddToJoint =
      proof.proof_category === 'Exhibit' &&
      hasAttachment &&
      isTopLevel &&
      !isOriginalPdfProof;

    if (canOptimizePdf) {
      actions.push({ id: 'optimizePdf', label: 'Optimize PDF', icon: FileText, action: () => setOptimizeDialogOpen(true), color: 'text-blue-600' });
    }

    if ((normalizedTab === 'draft' || proof.status === 'Draft') && canAddToJoint) {
      actions.push({ id: 'addToJoint', label: 'Add to Joint', icon: Link2, action: onAddToJoint, color: 'text-blue-600' });
    }

    if (isTopLevel && (normalizedTab === 'joint' || proof.status === 'Joint') && proof.proof_category === 'Exhibit') {
      actions.push({ id: 'admitAsExhibit', label: 'Admit as Exhibit', icon: CheckCircle, action: onAdmitAsExhibit, color: 'text-green-600' });
      actions.push({ id: 'admitAsDemonstrative', label: 'Mark as Demo', icon: Copy, action: onAdmitAsDemonstrative, color: 'text-purple-600' });
      actions.push({ id: 'removeFromJoint', label: 'Remove from Joint', icon: Circle, action: onRemoveFromJoint, color: 'text-slate-600' });
    }

    if (isTopLevel && (normalizedTab === 'admitted' || proof.status === 'Admitted')) {
      actions.push({ id: 'unAdmit', label: 'Un-Admit', icon: Circle, action: onUnAdmit, color: 'text-slate-600' });
    }

    if (isTopLevel && (normalizedTab === 'demonstrative' || proof.status === 'Demonstrative')) {
      actions.push({ id: 'unAdmitDemo', label: 'Un-Admit', icon: Circle, action: onUnAdmit, color: 'text-slate-600' });
    }

    actions.push({ id: 'delete', label: 'Delete', icon: Trash2, action: handleDelete, color: 'text-red-600', separator: true });

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4 text-slate-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <div key={action.id}>
                {action.separator && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={action.action} className="cursor-pointer">
                  <Icon className={`w-4 h-4 mr-2 ${action.color}`} />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <PdfOptimizationDialog
        open={optimizeDialogOpen}
        onOpenChange={(open) => {
          setOptimizeDialogOpen(open);
          if (!open && !optimizeMutation.isPending) setOptimizeProgress({ value: 0, label: '' });
        }}
        title="Optimize Dropbox PDF"
        description="This saves a new processed copy into your Dropbox save folder and makes this proof use that new file."
        confirmLabel="Save processed PDF"
        isSubmitting={optimizeMutation.isPending}
        progressValue={optimizeProgress.value}
        progressLabel={optimizeProgress.label}
        onSubmit={(options) => optimizeMutation.mutate(options)}
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

      <AlertDialog open={deleteErrorOpen} onOpenChange={setDeleteErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Proof</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700">{deleteError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setDeleteErrorOpen(false)}>Understood</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}