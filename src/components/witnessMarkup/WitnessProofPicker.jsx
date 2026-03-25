import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function WitnessProofPicker({ proofs = [], isLoading = false, searchValue = '', onSearchChange }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Witness Markup</h1>
        <p className="mt-3 text-sm text-slate-600">Choose a PDF proof to open in Witness View, or use the button from Attorney Hub to open one directly.</p>
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search proof name or exhibit number"
          className="mt-4 h-11"
        />
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : proofs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">No PDF proofs matched your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proofs.map((proof) => {
            const exhibitNumber = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || proof.draft_exhibit_num || '';
            return (
              <div key={proof.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{proof.formal_name || proof.name || 'Untitled Proof'}</p>
                    <p className="mt-1 text-xs text-slate-500">{proof.proof_category} · {proof.status || 'Draft'}</p>
                  </div>
                  {exhibitNumber ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{exhibitNumber}</span> : null}
                </div>
                <Button asChild className="mt-4 w-full gap-2 bg-blue-600 hover:bg-blue-700">
                  <Link to={`/WitnessMarkup?proofId=${proof.id}`}>
                    <ExternalLink className="h-4 w-4" />
                    Open Witness View
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}