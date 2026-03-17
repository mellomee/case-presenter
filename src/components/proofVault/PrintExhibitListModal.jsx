import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DISPLAY_PROMOTED_STATUSES = ['Joint', 'Admitted', 'Demonstrative'];

const sortRows = (rows) =>
  [...rows].sort((a, b) => {
    const exhibitCompare = String(a.exhibit_number || '').localeCompare(String(b.exhibit_number || ''), undefined, { numeric: true });
    if (exhibitCompare !== 0) return exhibitCompare;
    return String(a.formal_name || '').localeCompare(String(b.formal_name || ''));
  });

export default function PrintExhibitListModal({ open, onClose, proofs = [] }) {
  const [listType, setListType] = useState('joint');

  const rows = useMemo(() => {
    const exhibits = proofs.filter((proof) => proof.proof_category === 'Exhibit');
    const topLevelExhibits = exhibits.filter((proof) => !proof.parent_proof_id);
    const promotedExtracts = exhibits.filter(
      (proof) => proof.proof_child_type === 'Extract' && DISPLAY_PROMOTED_STATUSES.includes(proof.status)
    );

    const buildStatusList = (status) => {
      const baseRows = topLevelExhibits.filter((proof) => proof.status === status);
      const extractRows = promotedExtracts.filter((proof) => proof.status === status);
      return [...baseRows, ...extractRows];
    };

    if (listType === 'joint') {
      return sortRows(
        buildStatusList('Joint').map((proof) => ({
          exhibit_number: proof.joint_exhibit_num || '—',
          formal_name: proof.formal_name || proof.name || 'Untitled Exhibit',
        }))
      );
    }

    return sortRows(
      [...buildStatusList('Admitted'), ...buildStatusList('Demonstrative')].map((proof) => ({
        exhibit_number:
          proof.admitted_exhibit_num ||
          proof.demonstrative_exhibit_num ||
          proof.joint_exhibit_num ||
          '—',
        formal_name: proof.formal_name || proof.name || 'Untitled Exhibit',
      }))
    );
  }, [listType, proofs]);

  const title = listType === 'joint' ? 'Joint Exhibit List' : 'Court Exhibit List';

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    XLSX.writeFile(workbook, `${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const tableRows = rows
      .map(
        (row) => `
          <tr>
            <td>${row.exhibit_number}</td>
            <td>${row.formal_name}</td>
          </tr>
        `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            p { color: #475569; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>${rows.length} exhibit${rows.length === 1 ? '' : 's'}</p>
          <table>
            <thead>
              <tr>
                <th>Exhibit #</th>
                <th>Formal Exhibit Name</th>
              </tr>
            </thead>
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={listType === 'joint' ? 'default' : 'outline'}
                className={listType === 'joint' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setListType('joint')}
              >
                Joint
              </Button>
              <Button
                type="button"
                variant={listType === 'court' ? 'default' : 'outline'}
                className={listType === 'court' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setListType('court')}
              >
                Court
              </Button>
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

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Badge className="bg-slate-100 text-slate-700">{rows.length}</Badge>
            <span>{rows.length === 1 ? 'exhibit' : 'exhibits'} in this list</span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-44">Exhibit #</th>
                  <th className="px-4 py-3 text-left font-medium">Formal Exhibit Name</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                      No exhibits found for this list.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={`${row.exhibit_number}-${row.formal_name}-${index}`} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-mono text-slate-700">{row.exhibit_number}</td>
                      <td className="px-4 py-3 text-slate-900">{row.formal_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}