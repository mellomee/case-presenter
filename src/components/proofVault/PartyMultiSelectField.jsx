import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

export default function PartyMultiSelectField({
  label = 'Assign to Parties',
  value = [],
  onChange,
  parties = [],
  required = false,
  helperText = '',
}) {
  const selectedParties = parties.filter((party) => value.includes(party.id));
  const allPartyIds = parties.map((party) => party.id);

  const toggleParty = (partyId) => {
    onChange(
      value.includes(partyId)
        ? value.filter((id) => id !== partyId)
        : [...value, partyId]
    );
  };


  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label} {required && '*'}
      </label>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal text-left">
            <span className="truncate">
              {selectedParties.length > 0
                ? `${selectedParties.length} part${selectedParties.length === 1 ? 'y' : 'ies'} selected`
                : 'Select one or more parties'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          <div className="mb-2 flex justify-end gap-3 px-2">
            <button
              type="button"
              onClick={() => onChange(allPartyIds)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Deselect all
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {parties.map((party) => (
              <label
                key={party.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
              >
                <Checkbox
                  checked={value.includes(party.id)}
                  onCheckedChange={() => toggleParty(party.id)}
                />
                <span className="text-sm text-slate-700">
                  {party.first_name} {party.last_name}
                </span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedParties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedParties.map((party) => (
            <Badge key={party.id} variant="secondary" className="bg-slate-100 text-slate-700">
              {party.first_name} {party.last_name}
            </Badge>
          ))}
        </div>
      )}

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}