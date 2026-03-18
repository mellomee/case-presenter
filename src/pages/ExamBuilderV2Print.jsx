import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PrintableExamPage from '@/components/examV2/PrintableExamPage.jsx';

export default function ExamBuilderV2Print() {
  const [hasPrinted, setHasPrinted] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPartyId = urlParams.get('partyId') || '';
  const selectedExamType = urlParams.get('examType') || 'Direct';

  const { data: parties = [] } = useQuery({ queryKey: ['printParties'], queryFn: () => base44.entities.Party.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['printProofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: exams = [] } = useQuery({ queryKey: ['printExams'], queryFn: () => base44.entities.ExamV2.list() });
  const { data: examItems = [] } = useQuery({ queryKey: ['printExamItems'], queryFn: () => base44.entities.ExamItemV2.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['printAdmissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });

  const selectedParty = parties.find((party) => party.id === selectedPartyId) || null;
  const currentExam = exams.find((exam) => exam.party_id === selectedPartyId && exam.exam_type === selectedExamType) || null;
  const currentItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootItems = useMemo(
    () => currentItems.filter((item) => !item.parent_item_id && item.item_type !== 'question').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [currentItems]
  );
  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const partyName = selectedParty ? `${selectedParty.first_name} ${selectedParty.last_name}` : 'Selected Party';

  useEffect(() => {
    if (hasPrinted || rootItems.length === 0) return;

    const timeout = window.setTimeout(() => {
      window.print();
      setHasPrinted(true);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [hasPrinted, rootItems.length]);

  return (
    <div className="min-h-screen bg-slate-100">
      <style>{`
        @media print {
          body { background: white; }
          .print-toolbar { display: none; }
        }
      `}</style>

      <div className="print-toolbar sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Exam Builder V2 Print</p>
          <p className="text-xs text-slate-500">{partyName} · {selectedExamType}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.close()}>Close</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      {rootItems.length > 0 ? (
        <div>
          {rootItems.map((item, index) => (
            <PrintableExamPage
              key={item.id}
              rootItem={item}
              pageNumber={index + 1}
              questionItems={currentItems}
              proofsById={proofsById}
              admissionTemplates={admissionTemplates}
              partyName={partyName}
              examType={selectedExamType}
              isLast={index === rootItems.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="p-10 text-center text-slate-500">No V2 exam content was found for this party and exam type.</div>
      )}
    </div>
  );
}