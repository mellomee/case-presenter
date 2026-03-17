import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function formatDatePrinted() {
  return new Date().toLocaleDateString();
}

function buildDisplayProofs(proofs, status) {
  const exhibits = proofs.filter((proof) => proof.proof_category === 'Exhibit');
  const topLevel = exhibits.filter((proof) => !proof.parent_proof_id && proof.status === status);
  const promotedExtracts = exhibits.filter(
    (proof) => proof.proof_child_type === 'Extract' && proof.status === status
  );

  return [...topLevel, ...promotedExtracts].sort((a, b) => {
    const exhibitA = status === 'Joint' ? a.joint_exhibit_num || '' : a.admitted_exhibit_num || '';
    const exhibitB = status === 'Joint' ? b.joint_exhibit_num || '' : b.admitted_exhibit_num || '';
    const exhibitCompare = exhibitA.localeCompare(exhibitB, undefined, { numeric: true });
    if (exhibitCompare !== 0) return exhibitCompare;
    return (a.formal_name || a.name || '').localeCompare(b.formal_name || b.name || '');
  });
}

function formatHistory(proof) {
  const parts = [];
  if (proof.draft_exhibit_num) parts.push(`D: ${proof.draft_exhibit_num}`);
  if (proof.joint_exhibit_num) parts.push(`J: ${proof.joint_exhibit_num}`);
  if (proof.admitted_exhibit_num) parts.push(`Adm: ${proof.admitted_exhibit_num}`);
  if (proof.demonstrative_exhibit_num) parts.push(`Demo: ${proof.demonstrative_exhibit_num}`);
  return parts.length ? parts.join(' → ') : '—';
}

export default function PrintExhibitListModal({ open, onClose, proofs = [] }) {
  const [selectedStatus, setSelectedStatus] = useState('Joint');
  const [selectedView, setSelectedView] = useState('internal');

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const caseName = settings[0]?.case_name || 'Case Presenter';
  const datePrinted = formatDatePrinted();
  const title = `${selectedStatus} Exhibit List${selectedView === 'internal' ? ' — Internal View' : ''}`;

  const rows = useMemo(() => {
    const visibleProofs = buildDisplayProofs(proofs, selectedStatus);

    return visibleProofs.map((proof) => {
      const party = parties.find((item) => item.id === proof.party_id);
      const parentProof = proof.parent_proof_id ? proofs.find((item) => item.id === proof.parent_proof_id) : null;
      const exhibitNumber = selectedStatus === 'Joint' ? proof.joint_exhibit_num || '—' : proof.admitted_exhibit_num || '—';
      const offeredBy = selectedStatus === 'Joint' ? proof.joint_by || '—' : proof.admitted_by || '—';

      return {
        exhibit_number: selectedView === 'internal' && selectedStatus === 'Joint' ? `J: ${exhibitNumber}` : exhibitNumber,
        internal_name: proof.name || '—',
        original_name: parentProof ? (parentProof.formal_name || parentProof.name || '—') : (proof.name || '—'),
        formal_name: proof.formal_name || proof.name || 'Untitled Exhibit',
        type: proof.file_type || '—',
        party: party ? `${party.first_name} ${party.last_name}` : '—',
        status: proof.status || '—',
        offered_by: offeredBy,
        history: formatHistory(proof),
      };
    });
  }, [parties, proofs, selectedStatus, selectedView]);

  const handleExportExcel = () => {
    const exportRows = selectedView === 'internal'
      ? rows.map((row) => ({
          'Ex. #': row.exhibit_number,
          'Internal Name': row.internal_name,
          'Original Name': row.original_name,
          'Formal Name': row.formal_name,
          'Exhibit History': row.history,
          'Offered By': row.offered_by,
          Type: row.type,
          Party: row.party,
          Status: row.status,
        }))
      : rows.map((row) => ({
          'Ex. #': row.exhibit_number,
          'Formal Name': row.formal_name,
        }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    XLSX.writeFile(workbook, `${selectedStatus.toLowerCase()}-${selectedView}-exhibit-list.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    const tableHead = selectedView === 'internal'
      ? `
        <tr>
          <th>Ex. #</th>
          <th>Internal Name</th>
          <th>Original Name</th>
          <th>Formal Name</th>
          <th>History</th>
          <th>Offered By</th>
          <th>Type</th>
          <th>Party</th>
          <th>Status</th>
        </tr>
      `
      : `
        <tr>
          <th>Ex. #</th>
          <th>Formal Name</th>
        </tr>
      `;

    const tableRows = rows.map((row) => selectedView === 'internal'
      ? `
        <tr>
          <td>${row.exhibit_number}</td>
          <td><div style="font-weight: 700;">${row.internal_name}</div></td>
          <td>${row.original_name}</td>
          <td><div style="font-style: italic; color: #475569;">${row.formal_name}</div></td>
          <td>${row.history}</td>
          <td>${row.offered_by}</td>
          <td>${row.type}</td>
          <td>${row.party}</td>
          <td>${row.status}</td>
        </tr>
      `
      : `
        <tr>
          <td>${row.exhibit_number}</td>
          <td>${row.formal_name}</td>
        </tr>
      `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
            .case { font-weight: 700; }
            .title { font-weight: 700; margin: 12px 0 16px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; vertical-align: top; }
            th { font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="case">CASE: ${caseName}</div>
            <div>${datePrinted}</div>
          </div>
          <div class="title">${title}</div>
          <table>
            <thead>${tableHead}</thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Print Exhibit List</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedStatus === 'Joint' ? 'default' : 'outline'}
                className={selectedStatus === 'Joint' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setSelectedStatus('Joint')}
              >
                Joint
              </Button>
              <Button
                type="button"
                variant={selectedStatus === 'Admitted' ? 'default' : 'outline'}
                className={selectedStatus === 'Admitted' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setSelectedStatus('Admitted')}
              >
                Admitted
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedView === 'internal' ? 'default' : 'outline'}
                className={selectedView === 'internal' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setSelectedView('internal')}
              >
                Internal View
              </Button>
              <Button
                type="button"
                variant={selectedView === 'court' ? 'default' : 'outline'}
                className={selectedView === 'court' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setSelectedView('court')}
              >
                Court View
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Badge className="bg-slate-100 text-slate-700">{rows.length}</Badge>
              <span>{title}</span>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleExportExcel}>
                Export Excel
              </Button>
              <Button type="button" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                Print
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 text-sm">
              <div>
                <div className="font-semibold text-slate-900">CASE: {caseName}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</div>
              </div>
              <div className="text-slate-500">{datePrinted}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  {selectedView === 'internal' ? (
                    <tr>
                      <th className="px-4 py-3 text-left font-medium w-28">Ex. #</th>
                      <th className="px-4 py-3 text-left font-medium">Internal Name</th>
                      <th className="px-4 py-3 text-left font-medium">Original Name</th>
                      <th className="px-4 py-3 text-left font-medium">Formal Name</th>
                      <th className="px-4 py-3 text-left font-medium">History</th>
                      <th className="px-4 py-3 text-left font-medium w-32">Offered By</th>
                      <th className="px-4 py-3 text-left font-medium w-24">Type</th>
                      <th className="px-4 py-3 text-left font-medium">Party</th>
                      <th className="px-4 py-3 text-left font-medium w-24">Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-3 text-left font-medium w-28">Ex. #</th>
                      <th className="px-4 py-3 text-left font-medium">Formal Name</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={selectedView === 'internal' ? 9 : 2} className="px-4 py-10 text-center text-slate-500">
                        No exhibits found for this list.
                      </td>
                    </tr>
                  ) : selectedView === 'internal' ? (
                    rows.map((row, index) => (
                      <tr key={`${row.exhibit_number}-${row.formal_name}-${index}`} className="border-t border-slate-200 align-top">
                        <td className="px-4 py-3 font-mono text-slate-700">{row.exhibit_number}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.internal_name}</td>
                        <td className="px-4 py-3 text-slate-700">{row.original_name}</td>
                        <td className="px-4 py-3 italic text-slate-600">{row.formal_name}</td>
                        <td className="px-4 py-3 text-slate-700">{row.history}</td>
                        <td className="px-4 py-3 text-slate-700">{row.offered_by}</td>
                        <td className="px-4 py-3 text-slate-700">{row.type}</td>
                        <td className="px-4 py-3 text-slate-700">{row.party}</td>
                        <td className="px-4 py-3 text-slate-700">{row.status}</td>
                      </tr>
                    ))
                  ) : (
                    rows.map((row, index) => (
                      <tr key={`${row.exhibit_number}-${row.formal_name}-${index}`} className="border-t border-slate-200 align-top">
                        <td className="px-4 py-3 font-mono text-slate-700">{row.exhibit_number}</td>
                        <td className="px-4 py-3 text-slate-900">{row.formal_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}