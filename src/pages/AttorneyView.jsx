import React, { useState } from 'react';
import { Tv, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TrialNav from '@/components/attorneyView/TrialNav.jsx';
import ExamScript from '@/components/attorneyView/ExamScript.jsx';
import ProofViewer from '@/components/attorneyView/ProofViewer.jsx';

export default function AttorneyView() {
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedProofId, setSelectedProofId] = useState(null);
  const [panelLayout, setPanelLayout] = useState('split'); // 'split' or 'full'

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => base44.entities.Exam.list(),
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedProof = proofs.find((p) => p.id === selectedProofId);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tv className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl font-bold text-white">Trial Presentation</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-600 rounded-lg">
              <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-72 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <TrialNav
            exams={exams}
            selectedExamId={selectedExamId}
            onSelectExam={setSelectedExamId}
            proofs={proofs}
            selectedProofId={selectedProofId}
            onSelectProof={setSelectedProofId}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {panelLayout === 'split' ? (
            <div className="h-full flex gap-px bg-slate-700">
              {/* Left: Exam Script */}
              <div className="flex-1 bg-slate-800 overflow-y-auto">
                {selectedExam ? (
                  <ExamScript exam={selectedExam} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-slate-400 mb-2">Select an examination</p>
                      <p className="text-sm text-slate-500">from the navigation panel</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Proof Viewer */}
              <div className="flex-1 bg-slate-800 overflow-y-auto">
                {selectedProof ? (
                  <ProofViewer proof={selectedProof} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-slate-400 mb-2">Select a proof/exhibit</p>
                      <p className="text-sm text-slate-500">from the navigation panel</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-800 overflow-y-auto">
              {selectedExam ? (
                <ExamScript exam={selectedExam} />
              ) : selectedProof ? (
                <ProofViewer proof={selectedProof} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-slate-400">Select content from navigation</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}