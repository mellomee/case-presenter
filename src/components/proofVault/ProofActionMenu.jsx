import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ProofActionMenu({ proof, status, onEdit, onView, onDelete }) {
  const queryClient = useQueryClient();
  const isTopLevel = !proof.parent_proof_id;
  const isPDF = proof.file_type === 'PDF';
  const isVideo = proof.file_type === 'Video';
  const isImage = proof.file_type === 'Image';

  const getActionsByStatusAndType = () => {
    const actions = [];

    // Edit & View always available
    actions.push({ label: 'Edit', action: 'edit' });
    actions.push({ label: 'View', action: 'view' });

    if (status === 'Draft') {
      // Top-level specific actions in Draft
      if (isTopLevel) {
        if (isPDF) {
          actions.push({ label: 'Extract', action: 'extract' });
        }
        if (isPDF || isImage || isVideo) {
          actions.push({ label: 'Add to Joint', action: 'addJoint' });
        }
        if (isVideo) {
          actions.push({ label: 'Clip', action: 'clip' });
        }
      }
      // Extract/child specific actions
      else {
        if (isPDF || isVideo) {
          actions.push({ label: 'Clip', action: 'clip' });
        }
      }
    } else if (status === 'Joint') {
      // Top-level in Joint
      if (isTopLevel) {
        if (isPDF) {
          actions.push({ label: 'Extract', action: 'extract' });
        }
        actions.push({ label: 'Admit as Exhibit', action: 'admitExhibit' });
        actions.push({ label: 'Admit as Demonstrative', action: 'admitDemo' });
        actions.push({ label: 'Remove from Joint', action: 'removeJoint' });
      }
      // Children in Joint inherit parent status, no status actions
      else {
        if (isPDF || isVideo) {
          actions.push({ label: 'Clip', action: 'clip' });
        }
      }
    } else if (status === 'Admitted') {
      actions.push({ label: 'Un-Admit', action: 'unadmit' });
    } else if (status === 'Demonstrative') {
      actions.push({ label: 'Un-Admit', action: 'unadmit' });
    }

    // Delete always last
    actions.push({ label: 'Delete', action: 'delete', destructive: true });

    return actions;
  };

  const handleActionClick = async (action) => {
    switch (action) {
      case 'edit':
        onEdit?.(proof);
        break;
      case 'view':
        onView?.(proof);
        break;
      case 'addJoint':
        await updateProofStatus('Joint');
        break;
      case 'admitExhibit':
        await updateProofStatus('Admitted');
        break;
      case 'admitDemo':
        await updateProofStatus('Demonstrative');
        break;
      case 'removeJoint':
        await updateProofStatus('Draft');
        break;
      case 'unadmit':
        await updateProofStatus('Joint');
        break;
      case 'delete':
        onDelete?.(proof);
        break;
      case 'extract':
      case 'clip':
        // TODO: Implement extract/clip
        break;
    }
  };

  const updateProofStatus = async (newStatus) => {
    try {
      await base44.entities.Proof.update(proof.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      base44.entities.ActivityLog.create({
        action: `Updated proof status to ${newStatus}`,
        entity_type: 'Proof',
        entity_id: proof.id,
        details: { from_status: proof.status, to_status: newStatus },
      }).catch(() => {});
    } catch (error) {
      alert('Failed to update proof');
    }
  };

  const actions = getActionsByStatusAndType();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, idx) => (
          <DropdownMenuItem
            key={action.action}
            onClick={() => handleActionClick(action.action)}
            className={action.destructive ? 'text-red-600 cursor-pointer' : 'cursor-pointer'}
          >
            {action.destructive && <Trash2 className="w-4 h-4 mr-2" />}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}