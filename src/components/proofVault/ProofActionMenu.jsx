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
  CheckCircle,
  Circle,
  Trash2,
  Copy,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { proofHasLinkedFile } from './proofAssetUtils';

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

  const { data: childProofs = [] } = useQuery({
    queryKey: ['childProofs', proof.id],
    queryFn: () => allProofs.filter((p) => p.parent_proof_id === proof.id),
  });

  const { data: attachedQuestions = [] } = useQuery({
    queryKey: ['questionsWithProof', proof.id],
    queryFn: async () => {
      if (!proof.id) return [];
      const questions = await base44.entities.Question.list();
      return questions.filter((q) => q.proof_ids && q.proof_ids.includes(proof.id));
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

  const getAvailableActions = () => {
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
      actions.push({ id: 'clip', label: isExtract ? 'Highlight' : 'Clip', icon: Scissors, action: onClip, color: 'text-orange-600' });
    }

    const isOriginalPdfProof = isPDF && isTopLevel && !proof.proof_child_type;
    const canAddToJoint =
      proof.proof_category === 'Exhibit' &&
      hasAttachment &&
      (isExtract || (isTopLevel && !isOriginalPdfProof));

    if ((currentTab === 'draft' || proof.status === 'Draft') && canAddToJoint) {
      actions.push({ id: 'addToJoint', label: 'Add to Joint', icon: Link2, action: onAddToJoint, color: 'text-blue-600' });
    }

    if ((currentTab === 'joint' || proof.status === 'Joint') && isTopLevel) {
      actions.push({ id: 'admitAsExhibit', label: 'Admit as Exhibit', icon: CheckCircle, action: onAdmitAsExhibit, color: 'text-green-600' });
      actions.push({ id: 'admitAsDemonstrative', label: 'Admit as Demonstrative', icon: Copy, action: onAdmitAsDemonstrative, color: 'text-purple-600' });
      actions.push({ id: 'removeFromJoint', label: 'Remove from Joint', icon: Circle, action: onRemoveFromJoint, color: 'text-slate-600' });
    }

    if (currentTab === 'admitted' || proof.status === 'Admitted') {
      actions.push({ id: 'unAdmit', label: 'Un-Admit', icon: Circle, action: onUnAdmit, color: 'text-slate-600' });
    }

    if (currentTab === 'demonstrative' || proof.status === 'Demonstrative') {
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