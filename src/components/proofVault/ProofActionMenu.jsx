import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2, Edit2, CheckCircle, Copy, Download } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProofActionMenu({ proof, onEdit }) {
  const [deleteError, setDeleteError] = useState(null);
  const queryClient = useQueryClient();

  const deleteProofMutation = useMutation({
    mutationFn: (id) => base44.entities.Proof.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(error.message || 'Cannot delete this proof. It may be in use.');
    },
  });

  const updateProofMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proof.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
    },
  });

  const handleDelete = () => {
    if (proof.status === 'Admitted') {
      setDeleteError('Cannot delete admitted proofs. Please contact administrator.');
      return;
    }
    deleteProofMutation.mutate(proof.id);
  };

  const handleStatusChange = (newStatus) => {
    updateProofMutation.mutate({
      id: proof.id,
      data: { status: newStatus },
    });
  };

  const isExhibit = proof.proof_category === 'Exhibit';
  const isAdmitted = proof.status === 'Admitted';
  const isDraft = proof.status === 'Draft';
  const isJoint = proof.status === 'Joint';

  const getStatusTransitions = () => {
    if (!isExhibit) return [];
    
    if (isDraft) return [
      { label: 'Mark as Joint', status: 'Joint', icon: Copy, color: 'text-blue-600' },
    ];
    if (isJoint) return [
      { label: 'Mark as Admitted', status: 'Admitted', icon: CheckCircle, color: 'text-green-600' },
    ];
    return [];
  };

  const canDelete = !isAdmitted;
  const transitions = getStatusTransitions();

  return (
    <>
      {deleteError && (
        <Alert className="mb-4 bg-red-50 border-red-200">
          <AlertDescription className="text-red-800 text-sm">{deleteError}</AlertDescription>
        </Alert>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Status Actions */}
          {transitions.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status Actions
              </div>
              {transitions.map((transition) => {
                const Icon = transition.icon;
                return (
                  <DropdownMenuItem
                    key={transition.status}
                    onClick={() => handleStatusChange(transition.status)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon className={`w-4 h-4 ${transition.color}`} />
                    <span>{transition.label}</span>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Edit Action */}
          <DropdownMenuItem onClick={() => onEdit(proof)} className="flex items-center gap-2 cursor-pointer">
            <Edit2 className="w-4 h-4 text-slate-600" />
            <span>Edit</span>
          </DropdownMenuItem>

          {/* Download Action (if file exists) */}
          {proof.file_url && (
            <DropdownMenuItem asChild>
              <a href={proof.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download</span>
              </a>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Delete Action */}
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={!canDelete}
            className={`flex items-center gap-2 ${canDelete ? 'cursor-pointer text-red-600 hover:bg-red-50' : 'text-slate-400 cursor-not-allowed'}`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{isAdmitted ? 'Cannot Delete' : 'Delete'}</span>
          </DropdownMenuItem>

          {isAdmitted && (
            <div className="px-3 py-2 text-xs text-slate-500 border-t">
              Admitted proofs cannot be deleted
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}