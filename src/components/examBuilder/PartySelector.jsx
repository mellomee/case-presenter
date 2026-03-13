import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function PartySelector({ parties, selectedParty, onSelect }) {
  const getPartyColor = (side) => {
    switch (side) {
      case 'Plaintiff':
        return 'bg-red-100 text-red-700';
      case 'Defense':
        return 'bg-blue-100 text-blue-700';
      case 'Neutral':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Select
      value={selectedParty?.id || ''}
      onValueChange={(partyId) => {
        const party = parties.find((p) => p.id === partyId);
        onSelect(party);
      }}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a party" />
      </SelectTrigger>
      <SelectContent>
        {parties.map((party) => (
          <SelectItem key={party.id} value={party.id}>
            <div className="flex items-center gap-2">
              <span>
                {party.first_name} {party.last_name}
              </span>
              <Badge className={`text-xs ${getPartyColor(party.side)}`}>
                {party.side}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}