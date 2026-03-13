import React, { useState } from 'react';
import { ChevronDown, BookOpen, FileText } from 'lucide-react';

export default function TrialNav({
  exams,
  selectedExamId,
  onSelectExam,
  proofs,
  selectedProofId,
  onSelectProof,
}) {
  const [expandedSection, setExpandedSection] = useState('exams');

  return (
    <div className="h-full flex flex-col">
      {/* Examinations Section */}
      <div className="border-b border-slate-700">
        <button
          onClick={() => setExpandedSection(expandedSection === 'exams' ? null : 'exams')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-100">Examinations</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              expandedSection === 'exams' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSection === 'exams' && (
          <div className="px-2 py-2 space-y-1 bg-slate-700/30">
            {exams.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-2">No examinations</p>
            ) : (
              exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => onSelectExam(exam.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedExamId === exam.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="font-medium truncate">{exam.title}</div>
                  <div className="text-xs opacity-75">
                    {exam.exam_type === 'direct' ? 'Direct' : 'Cross'}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Proofs Section */}
      <div className="border-b border-slate-700">
        <button
          onClick={() => setExpandedSection(expandedSection === 'proofs' ? null : 'proofs')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-slate-100">Exhibits</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              expandedSection === 'proofs' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSection === 'proofs' && (
          <div className="px-2 py-2 space-y-1 bg-slate-700/30 max-h-64 overflow-y-auto">
            {proofs.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-2">No exhibits</p>
            ) : (
              proofs.map((proof) => (
                <button
                  key={proof.id}
                  onClick={() => onSelectProof(proof.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedProofId === proof.id
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="font-medium truncate">{proof.title}</div>
                  {proof.exhibit_number && (
                    <div className="text-xs opacity-75">{proof.exhibit_number}</div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}