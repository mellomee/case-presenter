import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tv, ChevronLeft, ChevronRight, ExternalLink, User, LayoutList } from 'lucide-react';
import BucketNav from '@/components/attorneyView/BucketNav.jsx';
import CurrentQuestionCard from '@/components/attorneyView/CurrentQuestionCard.jsx';
import NextQuestionCard from '@/components/attorneyView/NextQuestionCard.jsx';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import OverviewPanel from '@/components/attorneyView/OverviewPanel.jsx';

// Build a flat ordered list of top-level questions/blocks from buckets
function buildFlatList(buckets, questions, admissionBlocks, proofs) {
  const allItems = [];

  for (const bucket of buckets) {
    // Get top-level questions (no parent) for this bucket
    const bucketQuestions = questions
      .filter(q => q.bucket_id === bucket.id && !q.parent_question_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Get admission blocks for this bucket
    const bucketBlocks = admissionBlocks
      .filter(ab => ab.bucket_id === bucket.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Merge by sort_order
    const merged = [
      ...bucketQuestions.map(q => ({ type: 'question', data: q, bucket })),
      ...bucketBlocks.map(ab => ({ type: 'block', data: { ...ab, block_type: 'AdmissionBlock', text: buildBlockText(ab, proofs) }, bucket })),
    ].sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));

    allItems.push(...merged);
  }

  // Attach children and proofs
  return allItems.map(item => {
    const children = item.type === 'question'
      ? buildChildren(item.data.id, questions)
      : [];

    const attachedProofs = item.type === 'question' && item.data.proof_ids
      ? (Array.isArray(item.data.proof_ids) ? item.data.proof_ids : [])
          .map(pid => proofs.find(p => p.id === pid))
          .filter(Boolean)
      : [];

    return { ...item, children, proofs: attachedProofs };
  });
}

function buildChildren(parentId, questions) {
  const children = questions
    .filter(q => q.parent_question_id === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return children.map(c => ({
    data: c,
    children: buildChildren(c.id, questions),
  }));
}

function buildBlockText(block, proofs) {
  const proof = proofs.find(p => p.id === block.proof_id);
  return proof ? `[Admission Block] ${proof.formal_name || proof.name}` : '[Admission Block]';
}

export default function AttorneyView() {
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProof, setSelectedProof] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: allBuckets = [] } = useQuery({
    queryKey: ['allBuckets'],
    queryFn: () => base44.entities.Bucket.list(),
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['allQuestions'],
    queryFn: () => base44.entities.Question.list(),
  });

  const { data: admissionBlocks = [] } = useQuery({
    queryKey: ['admissionBlocks'],
    queryFn: () => base44.entities.AdmissionBlock.list(),
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const buckets = useMemo(() => {
    if (!selectedPartyId) return [];
    return allBuckets
      .filter(b => b.party_id === selectedPartyId && b.exam_type === selectedExamType)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [allBuckets, selectedPartyId, selectedExamType]);

  const questions = useMemo(() => {
    if (!selectedPartyId) return [];
    return allQuestions.filter(q => q.party_id === selectedPartyId && q.type === selectedExamType);
  }, [allQuestions, selectedPartyId, selectedExamType]);

  const blocksForParty = useMemo(() => {
    if (!selectedPartyId) return [];
    return admissionBlocks.filter(ab => ab.party_id === selectedPartyId);
  }, [admissionBlocks, selectedPartyId]);

  const flatList = useMemo(
    () => buildFlatList(buckets, questions, blocksForParty, proofs),
    [buckets, questions, blocksForParty, proofs]
  );

  const currentItem = flatList[currentIndex] || null;
  const nextItem = flatList[currentIndex + 1] || null;

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  const goNext = useCallback(() => {
    if (currentIndex < flatList.length - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, flatList.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const jumpToBucket = useCallback((bucketId) => {
    const idx = flatList.findIndex(item => item.bucket.id === bucketId);
    if (idx >= 0) { setCurrentIndex(idx); setSelectedProof(null); }
  }, [flatList]);

  const currentBucketId = currentItem?.bucket?.id || null;

  const handleSelectProof = (proof) => setSelectedProof(proof);
  const handleCloseProof = () => setSelectedProof(null);

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Left Sidebar — Bucket Nav */}
      <div className="w-52 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
        <div className="px-3 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Tv className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white">Trial Screen</span>
          </div>
          <Select value={selectedPartyId} onValueChange={(v) => { setSelectedPartyId(v); setCurrentIndex(0); setSelectedProof(null); }}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 text-xs">
              <SelectValue placeholder="Select party…" />
            </SelectTrigger>
            <SelectContent>
              {parties.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPartyId && (
            <div className="flex gap-1 mt-2">
              {['Direct', 'Cross'].map(type => (
                <button
                  key={type}
                  onClick={() => { setSelectedExamType(type); setCurrentIndex(0); setSelectedProof(null); }}
                  className={`flex-1 text-xs py-1 rounded font-semibold transition-colors ${
                    selectedExamType === type
                      ? type === 'Direct' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          <BucketNav
            buckets={buckets}
            currentBucketId={currentBucketId}
            flatList={flatList}
            currentIndex={currentIndex}
            onJumpToBucket={jumpToBucket}
            onJumpToIndex={(idx) => { setCurrentIndex(idx); setSelectedProof(null); }}
          />
        </div>

        {/* Open Jury View */}
        <div className="px-3 py-3 border-t border-slate-700">
          <a href={createPageUrl('JuryView')} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
              <ExternalLink className="w-3 h-3" /> Jury View
            </Button>
          </a>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="px-6 py-3 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedParty && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-white">{selectedParty.first_name} {selectedParty.last_name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedExamType === 'Direct' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {selectedExamType}
                </span>
              </div>
            )}
          </div>
          {flatList.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{currentIndex + 1} / {flatList.length}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOverview(o => !o)}
                className={`gap-1.5 text-xs h-7 px-2.5 ${showOverview ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutList className="w-3.5 h-3.5" /> Overview
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {!selectedPartyId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Tv className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-400 mb-2">Select a party to begin</h2>
              <p className="text-sm text-slate-600">Choose a party from the sidebar to load their examination</p>
            </div>
          </div>
        ) : flatList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-500 text-lg">No questions found for this examination</p>
              <p className="text-slate-600 text-sm mt-1">Add questions in the Exam Builder first</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
            {/* Questions column */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
              {/* Current Question */}
              <CurrentQuestionCard
                item={currentItem}
                index={currentIndex}
                total={flatList.length}
                examType={selectedExamType}
                onSelectProof={handleSelectProof}
              />

              {/* Next Question */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Up Next</p>
                <NextQuestionCard
                  item={nextItem}
                  examType={selectedExamType}
                  onClick={goNext}
                />
              </div>

              {/* Nav Buttons */}
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="gap-2 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <Button
                  onClick={goNext}
                  disabled={currentIndex >= flatList.length - 1}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Proof Preview Pane */}
            <div className="w-80 flex-shrink-0 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proof Preview</span>
              </div>
              <div className="flex-1 min-h-0">
                <ProofPreviewPane proof={selectedProof} onClose={handleCloseProof} />
              </div>
            </div>

            {/* Overview Panel */}
            {showOverview && (
              <div className="w-72 flex-shrink-0 overflow-hidden rounded-xl border border-slate-700">
                <OverviewPanel
                  flatList={flatList}
                  currentIndex={currentIndex}
                  onJumpTo={(idx) => { setCurrentIndex(idx); setSelectedProof(null); }}
                  onClose={() => setShowOverview(false)}
                />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}