import React, { useEffect, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function InlineProofNameEditor({ proofId, name }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(name || '');

  useEffect(() => {
    setDraftName(name || '');
  }, [name]);

  const renameMutation = useMutation({
    mutationFn: (nextName) => base44.entities.Proof.update(proofId, { name: nextName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    const trimmedName = draftName.trim();
    if (!trimmedName || trimmedName === name) {
      setDraftName(name || '');
      setIsEditing(false);
      return;
    }
    renameMutation.mutate(trimmedName);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setDraftName(name || '');
              setIsEditing(false);
            }
          }}
          className="h-8 text-sm"
          autoFocus
        />
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={renameMutation.isPending}>
          <Check className="w-4 h-4 text-green-600" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => {
            setDraftName(name || '');
            setIsEditing(false);
          }}
          disabled={renameMutation.isPending}
        >
          <X className="w-4 h-4 text-slate-500" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
      <h3 className="font-semibold text-slate-900 truncate">{name}</h3>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setIsEditing(true)}>
        <Pencil className="w-3.5 h-3.5 text-slate-500" />
      </Button>
    </div>
  );
}