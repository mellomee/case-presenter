import React from 'react';
import { Card } from '@/components/ui/card';
import { Play } from 'lucide-react';
import ProofActions from './ProofActions';

export default function DepositionsList({ depositions, tabLocation, onEdit }) {
  if (depositions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Play className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No depositions found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {depositions.map((deposition) => (
        <Card key={deposition.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {deposition.formal_name || deposition.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{deposition.file_type}</p>
              {deposition.description && (
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{deposition.description}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <ProofActions proof={deposition} tabLocation={tabLocation} onEdit={onEdit} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}