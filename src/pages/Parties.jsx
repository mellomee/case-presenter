import React from 'react';
import { Users } from 'lucide-react';

export default function Parties() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-slate-900">Parties</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <p className="text-slate-600 text-center py-12">Parties placeholder — Phase 3</p>
        </div>
      </div>
    </div>
  );
}