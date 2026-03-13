import React from 'react';
import { Tv } from 'lucide-react';

export default function AttorneyView() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Tv className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-slate-900">Attorney Trial Screen</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <p className="text-slate-600 text-center py-12">Attorney View placeholder — Phases 19–21</p>
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">Jury View available at <code className="bg-slate-100 px-2 py-1 rounded">/present/jury</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}