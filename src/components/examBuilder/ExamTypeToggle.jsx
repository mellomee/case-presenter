import React from 'react';
import { Button } from '@/components/ui/button';

export default function ExamTypeToggle({ selectedType, onSelect }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-700">Exam Type:</span>
      <div className="flex gap-2">
        <Button
          variant={selectedType === 'Direct' ? 'default' : 'outline'}
          onClick={() => onSelect('Direct')}
          className={selectedType === 'Direct' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          🟢 Direct
        </Button>
        <Button
          variant={selectedType === 'Cross' ? 'default' : 'outline'}
          onClick={() => onSelect('Cross')}
          className={selectedType === 'Cross' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          🔴 Cross
        </Button>
      </div>
    </div>
  );
}