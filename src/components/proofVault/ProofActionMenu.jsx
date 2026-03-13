import React from 'react';
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
  Scissors,
  LogIn,
  CheckCircle,
  AlertCircle,
  LogOut,
  Trash2,
} from 'lucide-react';

export default function ProofActionMenu({
  proof,
  currentTab,
  allProofs,
  onEdit,
  onView,
  onDelete,
  onAddToJoint,
  onAdmitAsExhibit,
  onAdmitAsDemonstrative,
  onRemoveFromJoint,
  onUnAdmit,
  onCreateExtract,
  onCreateClip,
}) {
  const isTopLevel = !proof.parent_proof_id;
  const isChildProof = !!proof.parent_proof_id;
  const isExtract = proof.proof_child_type === 'Extract';
  const isPDF = proof.file_type === 'PDF';
  const isVideo = proof.file_type === 'Video';
  const children = allProofs.filter((p) => p.parent_proof_id === proof.id);
  const hasChildren = children.length > 0;

  // Determine available actions per tab
  const getActions = () => {
    const actions = [];

    // EDIT & VIEW (all)
    actions.push({ type: 'edit', label: 'Edit', icon: Pencil, color: 'text-slate-600' });
    if (proof.file_url || proof.video_url) {
      actions.push({ type: 'view', label: 'View', icon: Eye, color: 'text-slate-600' });
    }

    // EXTRACT (PDF only, top-level or Extract)
    if ((isPDF && isTopLevel) || isExtract) {
      actions.push({ type: 'extract', label: 'Extract', icon: Scissors, color: 'text-slate-600' });
    }

    // CLIP (Extract or Video top-level)
    if (isExtract || (isVideo && isTopLevel)) {
      actions.push({ type: 'clip', label: 'Clip', icon: Scissors, color: 'text-slate-600' });
    }

    // DRAFT TAB
    if (currentTab === 'draft') {
      if (isTopLevel) {
        actions.push({
          type: 'addToJoint',
          label: 'Add to Joint',
          icon: LogIn,
          color: 'text-blue-600',
        });
      }
      actions.push({
        type: 'delete',
        label: 'Delete',
        icon: Trash2,
        color: 'text-red-600',
      });
    }

    // JOINT TAB
    if (currentTab === 'joint') {
      if (isTopLevel) {
        actions.push({
          type: 'admitAsExhibit',
          label: 'Admit as Exhibit',
          icon: CheckCircle,
          color: 'text-green-600',
        });
        actions.push({
          type: 'admitAsDemonstrative',
          label: 'Admit as Demonstrative',
          icon: AlertCircle,
          color: 'text-purple-600',
        });
        actions.push({
          type: 'removeFromJoint',
          label: 'Remove from Joint',
          icon: LogOut,
          color: 'text-orange-600',
        });
        actions.push({
          type: 'delete',
          label: 'Delete',
          icon: Trash2,
          color: 'text-red-600',
        });
      }
    }

    // ADMITTED TAB
    if (currentTab === 'admitted') {
      actions.push({
        type: 'unAdmit',
        label: 'Un-Admit',
        icon: LogOut,
        color: 'text-blue-600',
      });
      actions.push({
        type: 'delete',
        label: 'Delete',
        icon: Trash2,
        color: 'text-red-600',
      });
    }

    // DEMONSTRATIVE TAB
    if (currentTab === 'demonstrative') {
      actions.push({
        type: 'unAdmit',
        label: 'Un-Admit',
        icon: LogOut,
        color: 'text-blue-600',
      });
      actions.push({
        type: 'delete',
        label: 'Delete',
        icon: Trash2,
        color: 'text-red-600',
      });
    }

    // DEPOSITIONS TAB (same as draft for child proofs)
    if (currentTab === 'depositions' && isTopLevel) {
      actions.push({
        type: 'delete',
        label: 'Delete',
        icon: Trash2,
        color: 'text-red-600',
      });
    }

    return actions;
  };

  const actions = getActions();

  const handleAction = (actionType) => {
    switch (actionType) {
      case 'edit':
        onEdit(proof);
        break;
      case 'view':
        onView(proof);
        break;
      case 'extract':
        onCreateExtract(proof);
        break;
      case 'clip':
        onCreateClip(proof);
        break;
      case 'addToJoint':
        onAddToJoint(proof);
        break;
      case 'admitAsExhibit':
        onAdmitAsExhibit(proof);
        break;
      case 'admitAsDemonstrative':
        onAdmitAsDemonstrative(proof);
        break;
      case 'removeFromJoint':
        onRemoveFromJoint(proof);
        break;
      case 'unAdmit':
        onUnAdmit(proof);
        break;
      case 'delete':
        handleDelete();
        break;
      default:
        break;
    }
  };

  const handleDelete = () => {
    let errorMessage = null;

    // Check for child proofs
    if (hasChildren) {
      errorMessage = `This proof has ${children.length} child proof${children.length > 1 ? 's' : ''}. Delete all children first.`;
    }

    if (errorMessage) {
      alert(`Cannot delete: ${errorMessage}`);
      return;
    }

    if (window.confirm('Are you sure you want to delete this proof?')) {
      onDelete(proof.id);
    }
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-600"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          const isSeparatorBefore = ['delete', 'removeFromJoint'].includes(action.type);

          return (
            <React.Fragment key={action.type}>
              {isSeparatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => handleAction(action.type)}
                className={`cursor-pointer ${action.color}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span>{action.label}</span>
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}