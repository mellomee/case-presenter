import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const VIEWS = ['Internal', 'Court'];
const STATUSES = ['Joint', 'Admitted'];

function ExhibitTable({ proofs, parties, status, viewMode }) {
  const filtered = proofs.filter(p => p.status === status && p.proof_category === 'Exhibit' && !p.parent_proof_id);
  const exNumKey = status === 'Joint' ? 'joint_exhibit_num' : 'admitted_exhibit_num';

  if (filtered.length === 0) return (
    <p style={{ color: '#64748b', fontStyle: 'italic', margin: '8px 0 16px' }}>No {status} exhibits.</p>
  );

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #1e293b', background: '#f8fafc' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Ex #</th>
          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>
            {viewMode === 'Internal' ? 'Internal Name' : 'Exhibit Name'}
          </th>
          {viewMode === 'Internal' && <>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Formal Name</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Party</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Type</th>
          </>}
          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>
            {status === 'Joint' ? 'Joined By' : 'Admitted By'}
          </th>
          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Date</th>
        </tr>
      </thead>
      <tbody>
        {filtered.sort((a, b) => (a[exNumKey] || '').localeCompare(b[exNumKey] || '')).map((p, i) => {
          const party = parties.find(pt => pt.id === p.party_id);
          const partyName = party ? `${party.first_name} ${party.last_name}` : '—';
          const byField = status === 'Joint' ? p.joint_by : p.admitted_by;
          const dateField = status === 'Joint' ? p.joint_date : p.admit_date;
          return (
            <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ padding: '7px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{p[exNumKey] || '—'}</td>
              <td style={{ padding: '7px 12px' }}>{viewMode === 'Internal' ? p.name : (p.formal_name || p.name)}</td>
              {viewMode === 'Internal' && <>
                <td style={{ padding: '7px 12px' }}>{p.formal_name || '—'}</td>
                <td style={{ padding: '7px 12px' }}>{partyName}</td>
                <td style={{ padding: '7px 12px' }}>{p.file_type}</td>
              </>}
              <td style={{ padding: '7px 12px' }}>{byField || '—'}</td>
              <td style={{ padding: '7px 12px' }}>{dateField ? new Date(dateField).toLocaleDateString() : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function PrintExhibitListModal({ open, onClose, proofs }) {
  const [selectedStatus, setSelectedStatus] = useState('Admitted');
  const [viewMode, setViewMode] = useState('Court');
  const printRef = useRef(null);

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
    enabled: open,
  });

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exhibit List — ${selectedStatus} (${viewMode})</title>
        <style>
          body { font-family: Georgia, serif; color: #0f172a; margin: 40px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; padding: 8px 12px; font-weight: 700; border-bottom: 2px solid #1e293b; background: #f8fafc; }
          td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Print Exhibit List
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex gap-6 items-center py-2 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
            <div className="flex gap-1">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    selectedStatus === s
                      ? s === 'Admitted' ? 'bg-green-600 text-white border-green-600' : 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">View</p>
            <div className="flex gap-1">
              {VIEWS.map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    viewMode === v
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handlePrint} className="ml-auto gap-2 bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-lg p-6">
          <div ref={printRef}>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', marginBottom: '4px', color: '#0f172a' }}>
              {selectedStatus} Exhibit List
            </h1>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              {viewMode} View · Printed {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <ExhibitTable proofs={proofs} parties={parties} status={selectedStatus} viewMode={viewMode} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}