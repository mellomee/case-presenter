import React from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function ProofAdmissionFields({
  exhibitNumberLabel,
  exhibitNumber,
  onExhibitNumberChange,
  admittedBy,
  onAdmittedByChange,
  admitDate,
  onAdmitDateChange,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {exhibitNumberLabel} *
        </label>
        <Input
          placeholder="e.g. C-3"
          value={exhibitNumber}
          onChange={(event) => onExhibitNumberChange(event.target.value)}
          className="text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">Format: Letter-Number (e.g., A-1, C-5)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Admitted By *
        </label>
        <RadioGroup value={admittedBy} onValueChange={onAdmittedByChange} className="grid grid-cols-2 gap-2">
          <div
            onClick={() => onAdmittedByChange('Plaintiff')}
            className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${admittedBy === 'Plaintiff' ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <RadioGroupItem value="Plaintiff" />
            Plaintiff
          </div>
          <div
            onClick={() => onAdmittedByChange('Defense')}
            className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${admittedBy === 'Defense' ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <RadioGroupItem value="Defense" />
            Defense
          </div>
        </RadioGroup>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Admitted Date *
        </label>
        <Input
          type="date"
          value={admitDate}
          onChange={(event) => onAdmitDateChange(event.target.value)}
          className="text-sm"
        />
      </div>
    </div>
  );
}