import React from 'react';
import ExamTextImportForm from '@/components/examImport/ExamTextImportForm';
import ExamTextFormatCard from '@/components/examImport/ExamTextFormatCard';

export default function ExamTextImport() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Exam Text Import</h1>
          <p className="text-sm text-slate-600">Pick the party and exam type, then paste your AI-generated bucket and question text.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ExamTextImportForm />
          <ExamTextFormatCard />
        </div>
      </div>
    </div>
  );
}