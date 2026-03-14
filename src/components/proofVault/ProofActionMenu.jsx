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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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

  // Fetch child proofs
  const { data: childProofs = [] } = useQuery({
    queryKey: ['childProofs', proof.id],
    queryFn: () => allProofs.filter((p) => p.parent_proof_id === proof.id),
  });

  // Fetch questions using this proof
  const { data: attachedQuestions = [] } = useQuery({
    queryKey: ['questionsWithProof', proof.id],
    queryFn: async () => {
      if (!proof.id) return [];
      const questions = await base44.entities.Question.list();
      return questions.filter((q) => q.proof_ids && q.proof_ids.includes(proof.id));
    },
  });

  // Determine which actions to show based on tab and proof type
  const getAvailableActions = () => {
    const isTopLevel = !proof.parent_proof_id;
    const isExtract = proof.proof_child_type === 'Extract';
    const isExtractClip = proof.proof_child_type === 'ExtractClip';
    const isVideoClip = proof.proof_child_type === 'VideoClip';
    const isPDF = proof.file_type === 'PDF';
    const isImage = proof.file_type === 'Image';
    const isVideo = proof.file_type === 'Video';

    const actions = [];

    // EDIT - always available
    actions.push({
      id: 'edit',
      label: 'Edit',
      icon: Pencil,
      action: onEdit,
      color: 'text-blue-600',
    });

    // VIEW - always available if file exists
    if (proof.file_url || proof.video_url) {
      actions.push({
        id: 'view',
        label: 'View',
        icon: Eye,
        action: onView,
        color: 'text-slate-600',
      });
    }

    // EXTRACT - PDF top-level (with file) or Extract only
    if ((isPDF && isTopLevel && proof.file_url) || isExtract) {
      actions.push({
        id: 'extract',
        label: 'Extract',
        icon: Scissors,
        action: onExtract,
        color: 'text-orange-600',
      });
    }

    // CLIP - Video top-level or Extract only (with file)
    if ((isVideo && isTopLevel && proof.file_url) || (isExtract && proof.file_url)) {
      actions.push({
        id: 'clip',
        label: 'Clip',
        icon: Scissors,
        action: onClip,
        color: 'text-orange-600',
      });
    }

    // DRAFT TAB
    if ((currentTab === 'draft' || proof.status === 'Draft') && (proof.file_url || proof.video_url)) {
      if (isTopLevel) {
        actions.push({
          id: 'addToJoint',
          label: 'Add to Joint',
          icon: Link2,
          action: onAddToJoint,
          color: 'text-blue-600',
        });
      }
    }

    // JOINT TAB
    if (currentTab === 'joint' || proof.status === 'Joint') {
      if (isTopLevel) {
        actions.push({
          id: 'admitAsExhibit',
          label: 'Admit as Exhibit',
          icon: CheckCircle,
          action: onAdmitAsExhibit,
          color: 'text-green-600',
        });
        actions.push({
          id: 'admitAsDemonstrative',
          label: 'Admit as Demonstrative',
          icon: Copy,
          action: onAdmitAsDemonstrative,
          color: 'text-purple-600',
        });
        actions.push({
          id: 'removeFromJoint',
          label: 'Remove from Joint',
          icon: Circle,
          action: onRemoveFromJoint,
          color: 'text-slate-600',
        });
      }
    }

    // ADMITTED TAB
    if (currentTab === 'admitted' || proof.status === 'Admitted') {
      actions.push({
        id: 'unAdmit',
        label: 'Un-Admit',
        icon: Circle,
        action: onUnAdmit,
        color: 'text-slate-600',
      });
    }

    // DEMONSTRATIVE TAB
    if (currentTab === 'demonstrative' || proof.status === 'Demonstrative') {
      actions.push({
        id: 'unAdmit',
        label: 'Un-Admit',
        icon: Circle,
        action: onUnAdmit,
        color: 'text-slate-600',
      });
    }

    // DELETE - always last with separator
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      action: handleDelete,
      color: 'text-red-600',
      separator: true,
    });

    return actions;
  };

  const handleDelete = () => {
    // Check for child proofs
    if (childProofs.length > 0) {
      setDeleteError(
        `This proof has ${childProofs.length} child proof${childProofs.length > 1 ? 's' : ''}. Delete all children first.`
      );
      setDeleteErrorOpen(true);
      return;
    }

    // Check for attached questions
    if (attachedQuestions.length > 0) {
      setDeleteError(
        `This proof is attached to ${attachedQuestions.length} question${attachedQuestions.length > 1 ? 's' : ''}. Remove from all questions first.`
      );
      setDeleteErrorOpen(true);
      return;
    }

    // Safe to delete
    if (confirm('Are you sure you want to delete this proof?')) {
      onDelete(proof.id);
    }
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
          {actions.map((action, idx) => {
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

      {/* Delete Error Dialog */}
      <AlertDialog open={deleteErrorOpen} onOpenChange={setDeleteErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Proof</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700">
              {deleteError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setDeleteErrorOpen(false)}>
            Understood
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}