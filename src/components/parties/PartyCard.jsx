import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function PartyCard({ party, onEdit, onDelete }) {
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.Credential.list(),
  });

  const roleLabel = roles.find((r) => r.id === party.role_id)?.name || 'No role';
  const partyCredentials = credentials.filter((c) => party.credentials?.includes(c.id)) || [];
  const fullName = `${party.first_name} ${party.last_name}`;

  const bgColor = party.side === 'Defense' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
  const badgeColor = party.side === 'Defense' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

  return (
    <div className={`rounded-lg border ${bgColor} p-4`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{fullName}</h3>
          <p className="text-xs text-slate-600">{party.side} • {roleLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onEdit(party)} size="sm" variant="ghost">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => onDelete(party.id)} size="sm" variant="ghost" className="text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {partyCredentials.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {partyCredentials.map((cred) => (
              <Badge key={cred.id} className={badgeColor} variant="outline">
                {cred.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {party.notes && <p className="text-xs text-slate-600 italic">{party.notes}</p>}
    </div>
  );
}