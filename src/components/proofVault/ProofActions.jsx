import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreVertical, Eye, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ProofActions({ proof, tabLocation, onEdit }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Check if proof can be deleted based on status and tab location
      const canDelete = getCanDelete();
      if (!canDelete.allowed) {
        throw new Error(canDelete.reason);
      }
      return base44.entities.Proof.delete(proof.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setDeleteDialogOpen(false);
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(error.message);
    },
  });

  const getCanDelete = () => {
    // Can't delete if admitted
    if (proof.status === 'Admitted') {
      return {
        allowed: false,
        reason: 'Cannot delete admitted proofs',
      };
    }

    // Can't delete if joint (unless you're the joiner)
    if (proof.status === 'Joint' && tabLocation !== 'joint') {
      return {
        allowed: false,
        reason: 'Cannot delete proofs from other parties',
      };
    }

    // Can't delete demonstrative
    if (proof.status === 'Demonstrative') {
      return {
        allowed: false,
        reason: 'Cannot delete demonstrative proofs',
      };
    }

    return { allowed: true };
  };

  const canDelete = getCanDelete().allowed;
  const hasAttachment = proof.file_url || proof.video_url;

  const getDynamicActions = () => {
    const actions = [];

    // View action (if there's an attachment)
    if (hasAttachment) {
      actions.push({
        id: 'view',
        label: 'View',
        icon: Eye,
        action: () => {
          const url = proof.file_url || proof.video_url;
          window.open(url, '_blank');
        },
      });
    }

    // Edit action (only for Draft)
    if (proof.status === 'Draft') {
      actions.push({
        id: 'edit',
        label: 'Edit',
        icon: Edit2,
        action: () => onEdit(proof),
      });
    }

    // Delete action
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      disabled: !canDelete,
      destructive: true,
      action: () => setDeleteDialogOpen(true),
    });

    return actions;
  };

  const actions = getDynamicActions();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-slate-900">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action, index) => (
            <div key={action.id}>
              {index > 0 && !action.id.startsWith('view') && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={action.action}
                disabled={action.disabled}
                className={`
                  ${action.destructive ? 'text-red-600 focus:text-red-600 focus:bg-red-50' : ''}
                  ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <action.icon className="w-4 h-4 mr-2" />
                <span>{action.label}</span>
                {action.disabled && action.destructive && (
                  <AlertCircle className="w-3 h-3 ml-auto text-orange-500" />
                )}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <AlertDialogTitle>Delete Proof?</AlertDialogTitle>
            </div>
            {deleteError ? (
              <AlertDialogDescription className="text-red-600 font-medium mt-2">
                {deleteError}
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription>
                This will permanently delete "{proof.formal_name || proof.name}". This action cannot be undone.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}