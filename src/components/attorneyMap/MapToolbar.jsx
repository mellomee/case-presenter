import React from 'react';
import { ArrowLeft, Maximize2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MapToolbar({
  mode,
  bucket,
  sideOptions,
  selectedSide,
  onSelectSide,
  witnesses,
  selectedWitnessId,
  onSelectWitness,
  searchTerm,
  onSearchChange,
  searchResults,
  onSelectSearch,
  onBack,
  onFit,
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur shrink-0">
      <div className="grid gap-3 xl:grid-cols-[auto_170px_220px_minmax(220px,1fr)_auto]">
        <div className="flex items-center gap-2">
          {mode === 'bucket' && (
            <Button variant="outline" onClick={onBack} className="h-11 rounded-xl border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attorney Map</p>
            <p className="text-sm font-semibold text-white">{mode === 'bucket' && bucket ? bucket.name : 'Witness Overview'}</p>
          </div>
        </div>

        <select value={selectedSide} onChange={(event) => onSelectSide(event.target.value)} className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none">
          {sideOptions.map((side) => <option key={side} value={side}>{side}</option>)}
        </select>

        <select value={selectedWitnessId} onChange={(event) => onSelectWitness(event.target.value)} className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none">
          {witnesses.map((witness) => <option key={witness.id} value={witness.id}>{witness.first_name} {witness.last_name}</option>)}
        </select>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder={mode === 'bucket' ? 'Search question sets, branches, proofs' : 'Search trial points and buckets'} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500" />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
              {searchResults.map((result) => (
                <button key={result.id} type="button" onClick={() => onSelectSearch(result)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-900">
                  <span className="text-sm text-slate-200">{result.label}</span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">{result.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onFit} className="h-11 rounded-xl bg-blue-600 px-4 hover:bg-blue-700">
          <Maximize2 className="mr-2 h-4 w-4" /> Fit Map
        </Button>
      </div>
    </header>
  );
}