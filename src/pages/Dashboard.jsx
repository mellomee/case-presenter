import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <p className="text-slate-600 text-center py-12">Dashboard placeholder — Phase 4</p>
        </div>
      </div>
    </div>
  );
}