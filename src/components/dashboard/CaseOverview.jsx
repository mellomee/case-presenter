import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase } from 'lucide-react';

export default function CaseOverview({ caseName, partyCount }) {
  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-slate-600">Active Case</h3>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">{caseName || 'Untitled Case'}</h2>
          <p className="text-sm text-slate-600">{partyCount} parties registered</p>
        </div>
      </div>
    </Card>
  );
}