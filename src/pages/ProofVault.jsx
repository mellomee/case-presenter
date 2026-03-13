import React from 'react';
import { FileText } from 'lucide-react';

export default function ProofVault() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-slate-900">Proof Vault</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <p className="text-slate-600 text-center py-12">Proof Vault placeholder — Phases 5–12</p>
        </div>
      </div>
    </div>
  );
}