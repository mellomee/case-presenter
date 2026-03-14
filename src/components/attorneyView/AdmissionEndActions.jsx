import React, { useState } from 'react';
import { CheckCircle2, Star, XCircle, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  Admitted: { label: 'Admitted', className: 'bg-green-100 text-green-700' },
  Demonstrative: { label: 'Demonstrative', className: 'bg-purple-100 text-purple-700' },
  Joint: { label: 'Joint', className: 'bg-blue-100 text-blue-700' },
  Draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
};

export default function AdmissionEndActions({ proof, onRuling, isLoading }) {
  const [mode, setMode] = useState(null); // 'admit' | 'demo' | 'not'
  const [exhibitNum, setExhibitNum] = useState('');
  const [admittedBy, setAdmittedBy] = useState('Plaintiff');

  if (!proof) return null;

  const currentStatus = proof.status;
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['Draft'];

  const handleAdmit = () => {
    if (!exhibitNum.trim()) return;
    onRuling({
      action: 'admit',
      proofId: proof.id,
      data: {
        status: 'Admitted',
        admitted_exhibit_num: exhibitNum.trim(),
        admitted_by: admittedBy,
        admit_date: new Date().toISOString().split('T')[0],
      },
    });
    setMode(null);
    setExhibitNum('');
  };

  const handleDemo = () => {
    onRuling({
      action: 'demo',
      proofId: proof.id,
      data: {
        status: 'Demonstrative',
        demonstrative_exhibit_num: proof.joint_exhibit_num || '',
      },
    });
    setMode(null);
  };

  const handleNotAdmitted = () => {
    onRuling({ action: 'not_admitted', proofId: proof.id, data: null });
    setMode(null);
  };

  const alreadyRuled = ['Admitted', 'Demonstrative'].includes(currentStatus);

  return (
    <div className="px-5 pb-5 pt-3 border-t border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Court Ruling</p>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${statusCfg.className}`}>{statusCfg.label}</Badge>
          {alreadyRuled && (
            <button
              onClick={() => setMode('change')}
              className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
            >
              Change
            </button>
          )}
        </div>
      </div>

      {/* Already ruled — show summary */}
      {alreadyRuled && mode !== 'change' ? (
        <div className={`rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
          currentStatus === 'Admitted'
            ? 'bg-green-950/40 text-green-400 border border-green-900/40'
            : 'bg-purple-950/40 text-purple-400 border border-purple-900/40'
        }`}>
          {currentStatus === 'Admitted' ? (
            <>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Admitted as Exhibit {proof.admitted_exhibit_num}
              {proof.admitted_by && <span className="text-xs opacity-70 ml-1">by {proof.admitted_by}</span>}
            </>
          ) : (
            <>
              <Star className="w-4 h-4 flex-shrink-0" />
              Admitted as Demonstrative {proof.demonstrative_exhibit_num ? `(${proof.demonstrative_exhibit_num})` : ''}
            </>
          )}
        </div>
      ) : (
        /* Action buttons */
        <div className="space-y-2">
          {/* Admit as Exhibit */}
          {mode === 'admit' ? (
            <div className="bg-green-950/30 border border-green-900/40 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-green-400">Admit as Exhibit</p>
              <div className="flex gap-2">
                <Input
                  value={exhibitNum}
                  onChange={e => setExhibitNum(e.target.value)}
                  placeholder="Exhibit # (e.g. P-1)"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 h-8 text-sm flex-1"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAdmit()}
                />
                <select
                  value={admittedBy}
                  onChange={e => setAdmittedBy(e.target.value)}
                  className="bg-slate-800 border border-slate-600 text-white rounded-md px-2 text-xs h-8"
                >
                  <option value="Plaintiff">Plaintiff</option>
                  <option value="Defense">Defense</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAdmit}
                  disabled={!exhibitNum.trim() || isLoading}
                  className="bg-green-600 hover:bg-green-700 h-7 text-xs gap-1.5"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Confirm Admission
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode(null)} className="h-7 text-xs text-slate-400">
                  Cancel
                </Button>
              </div>
            </div>
          ) : mode === 'demo' ? (
            <div className="bg-purple-950/30 border border-purple-900/40 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-purple-400">Admit as Demonstrative</p>
              <p className="text-xs text-slate-400">
                Inherits joint exhibit # {proof.joint_exhibit_num ? <span className="font-mono text-purple-300">{proof.joint_exhibit_num}</span> : <span className="italic">(none)</span>}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleDemo}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 h-7 text-xs gap-1.5"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                  Confirm Demonstrative
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode(null)} className="h-7 text-xs text-slate-400">
                  Cancel
                </Button>
              </div>
            </div>
          ) : mode === 'not' ? (
            <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-red-400">Mark as Not Admitted</p>
              <p className="text-xs text-slate-400">The proof status will not be changed. This is a local note only.</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleNotAdmitted}
                  className="bg-red-700 hover:bg-red-800 h-7 text-xs gap-1.5"
                >
                  <XCircle className="w-3 h-3" /> Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode(null)} className="h-7 text-xs text-slate-400">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Default button row */
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setMode('admit')}
                className="gap-1.5 bg-green-700 hover:bg-green-600 h-8 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Admit as Exhibit
              </Button>
              <Button
                size="sm"
                onClick={() => setMode('demo')}
                className="gap-1.5 bg-purple-700 hover:bg-purple-600 h-8 text-xs"
              >
                <Star className="w-3.5 h-3.5" /> Admit as Demonstrative
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode('not')}
                className="gap-1.5 border-red-800 text-red-400 hover:bg-red-950/30 h-8 text-xs"
              >
                <XCircle className="w-3.5 h-3.5" /> Not Admitted
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}