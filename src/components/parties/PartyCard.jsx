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

  const roleLabel = roles.find((r) => r.id === party.role_id)?.name || '—';
  const credentialIds = Array.isArray(party.credentials)
    ? party.credentials
    : Array.isArray(party.credentials?.ids)
      ? party.credentials.ids
      : [];
  const partyCredentials = credentials.filter((c) => credentialIds.includes(c.id));

  const sideColor = {
    'Plaintiff': 'bg-green-50 border-green-200',
    'Defense': 'bg-red-50 border-red-200',
    'Neutral': 'bg-yellow-50 border-yellow-200',
  }[party.side] || 'bg-slate-50 border-slate-200';

  const badgeColor = {
    'Plaintiff': 'bg-green-100 text-green-800',
    'Defense': 'bg-red-100 text-red-800',
    'Neutral': 'bg-yellow-100 text-yellow-800',
  }[party.side] || 'bg-slate-100 text-slate-800';

  return (
    <div className={`rounded-lg border ${sideColor} p-4`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{party.first_name} {party.last_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={badgeColor} variant="outline">
              {party.side}
            </Badge>
            {roleLabel !== '—' && <span className="text-xs text-slate-600">{roleLabel}</span>}
          </div>
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
              <Badge key={cred.id} className="bg-slate-100 text-slate-800" variant="outline">
                {cred.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}