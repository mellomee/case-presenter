import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tv, ChevronLeft, ChevronRight, ExternalLink, User, LayoutList, GripVertical } from 'lucide-react';
import BucketNav from '@/components/attorneyView/BucketNav.jsx';
import CurrentQuestionCard from '@/components/attorneyView/CurrentQuestionCard.jsx';
import NextQuestionCard from '@/components/attorneyView/NextQuestionCard.jsx';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import OverviewPanel from '@/components/attorneyView/OverviewPanel.jsx';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import AdmissionBlockTrialPanel from '@/components/attorneyView/AdmissionBlockTrialPanel.jsx';
import { buildAdmissionSteps } from '@/lib/admissionSteps';

// Build a flat ordered list of top-level questions/blocks from buckets
function parseObjectValue(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function normalizeProofIds(proofIds) {
  if (!proofIds) return [];
  if (Array.isArray(proofIds)) return proofIds.filter(Boolean);

  if (typeof proofIds === 'string') {
    try {
      return normalizeProofIds(JSON.parse(proofIds));
    } catch {
      return proofIds.split(',').map((id) => id.trim()).filter(Boolean);
    }
  }

  if (typeof proofIds === 'object') {
    if (Array.isArray(proofIds.ids)) return proofIds.ids.filter(Boolean);

    const entries = Object.entries(proofIds);
    if (entries.every(([, value]) => typeof value === 'boolean')) {
      return entries.filter(([, value]) => value).map(([key]) => key);
    }

    return Object.values(proofIds)
      .filter((value) => typeof value === 'string' && value)
      .map((value) => value.trim());
  }

  return [];
}

function normalizePartyIds(partyIds) {
  if (!partyIds) return [];
  if (Array.isArray(partyIds)) return partyIds.filter(Boolean);
  if (typeof partyIds === 'string') return [partyIds].filter(Boolean);
  if (typeof partyIds === 'object' && Array.isArray(partyIds.ids)) return partyIds.ids.filter(Boolean);
  return [];
}

function hydratePathNodes(nodes, proofs, parties) {
  return (Array.isArray(nodes) ? nodes : []).map((node, index) => ({
    ...node,
    id: node.id || `${node.admission_path || 'path'}-${index + 1}`,
    attachedProofs: normalizeProofIds(node.proof_ids)
      .map((proofId) => proofs.find((proof) => proof.id === proofId))
      .filter(Boolean),
    attachedParties: normalizePartyIds(node.party_ids)
      .map((partyId) => parties.find((party) => party.id === partyId))
      .filter(Boolean),
    children: hydratePathNodes(node.children || [], proofs, parties),
  }));
}

function hydratePathQuestionSets(value, proofs, parties) {
  const parsed = parseObjectValue(value, { admitted: [], not_admitted: [] }) || { admitted: [], not_admitted: [] };

  return {
    admitted: hydratePathNodes(parsed.admitted || [], proofs, parties),
    not_admitted: hydratePathNodes(parsed.not_admitted || [], proofs, parties),
  };
}

function buildFlatList(buckets, questions, admissionBlocks, proofs, parties, admissionTemplates) {
  const allItems = [];

  for (const bucket of buckets) {
    const bucketQuestions = questions
      .filter((q) => q.bucket_id === bucket.id && !q.parent_question_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const bucketBlocks = admissionBlocks
      .filter((ab) => ab.bucket_id === bucket.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const merged = [
      ...bucketQuestions.map((q) => ({ type: 'question', data: q, bucket })),
      ...bucketBlocks.map((ab) => ({ type: 'block', data: { ...ab, block_type: 'AdmissionBlock', text: buildBlockText(ab, proofs) }, bucket })),
    ].sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));

    allItems.push(...merged);
  }

  return allItems.map((item) => {
    const children = item.type === 'question'
      ? buildChildren(item.data.id, questions)
      : [];

    const attachedProofs = item.type === 'question'
      ? normalizeProofIds(item.data.proof_ids)
          .map((proofId) => proofs.find((proof) => proof.id === proofId))
          .filter(Boolean)
      : [];

    const blockProof = item.type === 'block'
      ? proofs.find((proof) => proof.id === item.data.proof_id) || null
      : null;

    const exhibitNum = blockProof
      ? blockProof.admitted_exhibit_num || blockProof.demonstrative_exhibit_num || blockProof.joint_exhibit_num || ''
      : '';

    return {
      ...item,
      children,
      proofs: attachedProofs,
      blockProof,
      blockSteps: item.type === 'block' ? buildAdmissionSteps(item.data, admissionTemplates, exhibitNum) : [],
      pathQuestionSets: item.type === 'block' ? hydratePathQuestionSets(item.data.path_question_sets, proofs, parties) : { admitted: [], not_admitted: [] },
    };
  });
}

function buildChildren(parentId, questions) {
  const children = questions
    .filter((q) => q.parent_question_id === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return children.map((child) => ({ data: child, children: buildChildren(child.id, questions) }));
}

function buildBlockText(block, proofs) {
  const proof = proofs.find((item) => item.id === block.proof_id);
  return proof ? `[Admission Block] ${proof.name}` : '[Admission Block]';
}

function buildPathChildTree(nodes = []) {
  return nodes.map((node) => ({
    data: {
      id: node.id,
      text: node.text,
      expected_answer: node.expected_answer || '',
      notes: node.notes || '',
    },
    children: buildPathChildTree(node.children || []),
  }));
}

function buildPathQuestionItem(node, bucket, pathKey, parentBlockId) {
  return {
    type: 'path-question',
    bucket,
    pathKey,
    parentBlockId,
    data: {
      id: `${parentBlockId}-${pathKey}-${node.id}`,
      text: node.text,
      expected_answer: node.expected_answer || '',
      notes: node.notes || '',
      block_type: 'Question',
    },
    children: buildPathChildTree(node.children || []),
    proofs: node.attachedProofs || [],
  };
}

export default function AttorneyView() {
  const queryClient = useQueryClient();
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProof, setSelectedProof] = useState(null);
  const [showOverview, setShowOverview] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [desiredProofPaneWidth, setDesiredProofPaneWidth] = useState(() => {
    if (typeof window === 'undefined') return 420;
    const saved = Number(window.localStorage.getItem('attorney-proof-pane-width'));
    return Number.isFinite(saved) && saved > 0 ? saved : 420;
  });
  const [blockFlow, setBlockFlow] = useState(null);
  const [blockDecisions, setBlockDecisions] = useState({});
  const proofResizeRef = useRef(null);
  const questionColumnRef = useRef(null);

  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => base44.entities.Party.list() });
  const { data: allBuckets = [] } = useQuery({ queryKey: ['allBuckets'], queryFn: () => base44.entities.Bucket.list() });
  const { data: allQuestions = [] } = useQuery({ queryKey: ['allQuestions'], queryFn: () => base44.entities.Question.list() });
  const { data: admissionBlocks = [] } = useQuery({ queryKey: ['admissionBlocks'], queryFn: () => base44.entities.AdmissionBlock.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['proofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['admissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });

  const { juryState, update: updateJury } = useJurySync('attorney');

  const rulingMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofs'] }),
  });

  const handleRuling = useCallback(({ action, proofId, data }) => {
    if (action === 'not_admitted') return; // local note only, no DB change
    rulingMutation.mutate({ proofId, data });
  }, [rulingMutation]);

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
    () => buildFlatList(buckets, questions, blocksForParty, proofs, parties, admissionTemplates),
    [buckets, questions, blocksForParty, proofs, parties, admissionTemplates]
  );

  const currentItem = flatList[currentIndex] || null;
  const nextTopLevelItem = flatList[currentIndex + 1] || null;
  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const storedBlockDecision = currentItem?.type === 'block' && Object.prototype.hasOwnProperty.call(blockDecisions, currentItem.data.id)
    ? blockDecisions[currentItem.data.id]
    : undefined;
  const resolvedBlockDecision = storedBlockDecision !== undefined
    ? storedBlockDecision
    : currentItem?.blockProof?.status === 'Admitted'
      ? 'admit'
      : currentItem?.blockProof?.status === 'Demonstrative'
        ? 'demo'
        : null;

  useEffect(() => {
    if (currentItem?.type === 'block') {
      setBlockFlow((prev) => (
        prev?.blockId === currentItem.data.id
          ? prev
          : {
              blockId: currentItem.data.id,
              phase: 'sequence',
              stepIndex: 0,
              decision: resolvedBlockDecision,
              branchKey: null,
              branchIndex: 0,
            }
      ));
    } else {
      setBlockFlow(null);
    }
  }, [currentItem?.type, currentItem?.data?.id, resolvedBlockDecision]);

  const activeBlockFlow = currentItem?.type === 'block' && blockFlow?.blockId === currentItem.data.id
    ? blockFlow
    : null;

  const visibleBlockSteps = useMemo(() => {
    if (currentItem?.type !== 'block') return [];
    const steps = currentItem.blockSteps || [];
    return activeBlockFlow?.decision === 'admit' || activeBlockFlow?.decision === 'demo'
      ? steps
      : steps.filter((step) => step.key !== '5');
  }, [currentItem, activeBlockFlow]);

  const currentBlockStep = activeBlockFlow?.phase === 'sequence'
    ? visibleBlockSteps[activeBlockFlow.stepIndex] || visibleBlockSteps[0] || null
    : null;

  const branchItems = useMemo(() => {
    if (currentItem?.type !== 'block' || activeBlockFlow?.phase !== 'branch') return [];
    const pathKey = activeBlockFlow.branchKey === 'not_admitted' ? 'not_admitted' : 'admitted';
    return (currentItem.pathQuestionSets?.[pathKey] || []).map((node) =>
      buildPathQuestionItem(node, currentItem.bucket, pathKey, currentItem.data.id)
    );
  }, [currentItem, activeBlockFlow]);

  const displayCurrentItem = activeBlockFlow?.phase === 'branch'
    ? branchItems[activeBlockFlow.branchIndex] || null
    : currentItem;

  const displayNextItem = activeBlockFlow?.phase === 'branch'
    ? branchItems[activeBlockFlow.branchIndex + 1] || nextTopLevelItem || null
    : nextTopLevelItem;

  const admittedPathCount = currentItem?.type === 'block'
    ? (currentItem.pathQuestionSets?.admitted?.length || 0)
    : 0;

  const startBranch = useCallback((branchKey) => {
    if (currentItem?.type !== 'block') return;

    const nextBranchItems = (currentItem.pathQuestionSets?.[branchKey] || []).map((node) =>
      buildPathQuestionItem(node, currentItem.bucket, branchKey, currentItem.data.id)
    );

    if (nextBranchItems.length === 0) {
      if (currentIndex < flatList.length - 1) {
        setCurrentIndex((value) => value + 1);
        setSelectedProof(null);
        setBlockFlow(null);
      }
      return;
    }

    setBlockFlow((prev) => ({
      ...(prev || {}),
      blockId: currentItem.data.id,
      phase: 'branch',
      branchKey,
      branchIndex: 0,
    }));
  }, [currentItem, currentIndex, flatList.length]);

  const handleBlockDecision = useCallback((action) => {
    if (currentItem?.type !== 'block') return;

    setBlockDecisions((prev) => ({
      ...prev,
      [currentItem.data.id]: action ?? null,
    }));

    if (action === 'not_admitted') {
      startBranch('not_admitted');
      return;
    }

    if (!action) {
      setBlockFlow((prev) => ({
        ...(prev || {}),
        blockId: currentItem.data.id,
        phase: 'sequence',
        decision: null,
        branchKey: null,
        branchIndex: 0,
      }));
      return;
    }

    const publishStepIndex = (currentItem.blockSteps || []).findIndex((step) => step.key === '5');
    setBlockFlow((prev) => ({
      ...(prev || {}),
      blockId: currentItem.data.id,
      phase: 'sequence',
      decision: action,
      stepIndex: publishStepIndex >= 0 ? publishStepIndex : (prev?.stepIndex || 0),
      branchKey: null,
      branchIndex: 0,
    }));
  }, [currentItem, startBranch]);

  const canGoPrev = useMemo(() => {
    if (!currentItem) return false;
    if (currentItem.type !== 'block') return currentIndex > 0;
    if (activeBlockFlow?.phase === 'branch') {
      return activeBlockFlow.branchIndex > 0 || !!activeBlockFlow.decision || currentIndex > 0;
    }
    return (activeBlockFlow?.stepIndex || 0) > 0 || currentIndex > 0;
  }, [currentItem, currentIndex, activeBlockFlow]);

  const canGoNext = useMemo(() => {
    if (!currentItem) return false;
    if (currentItem.type !== 'block') return currentIndex < flatList.length - 1;

    if (activeBlockFlow?.phase === 'branch') {
      return activeBlockFlow.branchIndex < branchItems.length - 1 || currentIndex < flatList.length - 1;
    }

    if (!currentBlockStep) return false;

    if (currentBlockStep.key === '5' && (activeBlockFlow?.decision === 'admit' || activeBlockFlow?.decision === 'demo')) {
      return true;
    }

    if (currentBlockStep.key === '4' && activeBlockFlow?.decision === 'not_admitted') {
      return (currentItem.pathQuestionSets?.not_admitted?.length || 0) > 0 || currentIndex < flatList.length - 1;
    }

    return (activeBlockFlow?.stepIndex || 0) < visibleBlockSteps.length - 1;
  }, [currentItem, currentIndex, flatList.length, activeBlockFlow, currentBlockStep, visibleBlockSteps.length, branchItems.length]);

  const goNext = useCallback(() => {
    if (!currentItem) return;

    if (currentItem.type !== 'block') {
      if (currentIndex < flatList.length - 1) {
        setCurrentIndex((value) => value + 1);
        setSelectedProof(null);
      }
      return;
    }

    if (!activeBlockFlow) return;

    if (activeBlockFlow.phase === 'branch') {
      if (activeBlockFlow.branchIndex < branchItems.length - 1) {
        setBlockFlow((prev) => ({ ...prev, branchIndex: prev.branchIndex + 1 }));
      } else if (currentIndex < flatList.length - 1) {
        setCurrentIndex((value) => value + 1);
        setSelectedProof(null);
        setBlockFlow(null);
      }
      return;
    }

    if (currentBlockStep?.key === '5' && (activeBlockFlow.decision === 'admit' || activeBlockFlow.decision === 'demo')) {
      startBranch('admitted');
      return;
    }

    if (currentBlockStep?.key === '4' && activeBlockFlow.decision === 'not_admitted') {
      startBranch('not_admitted');
      return;
    }

    if (activeBlockFlow.stepIndex < visibleBlockSteps.length - 1) {
      setBlockFlow((prev) => ({ ...prev, stepIndex: prev.stepIndex + 1 }));
    }
  }, [currentItem, currentIndex, flatList.length, activeBlockFlow, branchItems.length, currentBlockStep, visibleBlockSteps.length, startBranch]);

  const goPrev = useCallback(() => {
    if (!currentItem) return;

    if (currentItem.type !== 'block') {
      if (currentIndex > 0) {
        setCurrentIndex((value) => value - 1);
        setSelectedProof(null);
      }
      return;
    }

    if (!activeBlockFlow) return;

    if (activeBlockFlow.phase === 'branch') {
      if (activeBlockFlow.branchIndex > 0) {
        setBlockFlow((prev) => ({ ...prev, branchIndex: prev.branchIndex - 1 }));
        return;
      }

      const targetStepKey = activeBlockFlow.branchKey === 'admitted' ? '5' : '4';
      const targetStepIndex = visibleBlockSteps.findIndex((step) => step.key === targetStepKey);
      setBlockFlow((prev) => ({
        ...prev,
        phase: 'sequence',
        stepIndex: targetStepIndex >= 0 ? targetStepIndex : 0,
      }));
      return;
    }

    if (activeBlockFlow.stepIndex > 0) {
      setBlockFlow((prev) => ({ ...prev, stepIndex: prev.stepIndex - 1 }));
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((value) => value - 1);
      setSelectedProof(null);
    }
  }, [currentItem, currentIndex, activeBlockFlow, visibleBlockSteps]);

  const jumpToBucket = useCallback((bucketId) => {
    const idx = flatList.findIndex(item => item.bucket.id === bucketId);
    if (idx >= 0) { setCurrentIndex(idx); setSelectedProof(null); }
  }, [flatList]);

  const currentBucketId = currentItem?.bucket?.id || null;

  const getMaxProofPaneWidth = useCallback(() => {
    const sidebarWidth = isSidebarCollapsed ? 56 : 208;
    const overviewWidth = showOverview ? 288 : 0;
    const pagePadding = 48;
    const resizeHandleWidth = 12;
    const columnGaps = showOverview ? 32 : 16;
    const minQuestionWidth = 240;

    return Math.max(360, window.innerWidth - sidebarWidth - overviewWidth - pagePadding - resizeHandleWidth - columnGaps - minQuestionWidth);
  }, [isSidebarCollapsed, showOverview]);

  const proofPaneWidth = useMemo(() => {
    if (typeof window === 'undefined') return Math.max(280, desiredProofPaneWidth);
    return Math.min(getMaxProofPaneWidth(), Math.max(280, desiredProofPaneWidth));
  }, [desiredProofPaneWidth, getMaxProofPaneWidth]);

  const startProofResize = useCallback((event) => {
    proofResizeRef.current = {
      startX: event.clientX,
      startWidth: proofPaneWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [proofPaneWidth]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!proofResizeRef.current) return;
      const delta = proofResizeRef.current.startX - event.clientX;
      const nextWidth = Math.max(280, proofResizeRef.current.startWidth + delta);
      setDesiredProofPaneWidth(nextWidth);
    };

    const handleMouseUp = () => {
      proofResizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('attorney-proof-pane-width', String(desiredProofPaneWidth));
  }, [desiredProofPaneWidth]);

  useEffect(() => {
    const handleResize = () => {
      setDesiredProofPaneWidth((current) => Math.max(280, current));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentItem?.type === 'block' && currentItem.blockProof) {
      setSelectedProof(currentItem.blockProof);
    }
  }, [currentItem]);

  useEffect(() => {
    const container = questionColumnRef.current;
    if (!container) return;

    const patchFollowupNavButtons = () => {
      container.querySelectorAll('button').forEach((button) => {
        const label = button.textContent?.trim();
        const parentCard = button.closest('.rounded-xl.border.border-slate-700.bg-slate-900\/40.overflow-hidden');
        if (!parentCard) return;
        if (label !== 'Previous' && label !== 'Next') return;

        button.disabled = false;
        button.removeAttribute('disabled');
        button.removeAttribute('aria-disabled');
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
      });
    };

    patchFollowupNavButtons();
    const observer = new MutationObserver(patchFollowupNavButtons);
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'class', 'aria-disabled'] });

    return () => observer.disconnect();
  }, [displayCurrentItem, currentItem?.id, currentIndex]);

  const isAdmittedPathLaunchStep = currentItem?.type === 'block'
    && activeBlockFlow?.phase !== 'branch'
    && currentBlockStep?.key === '5'
    && (activeBlockFlow?.decision === 'admit' || activeBlockFlow?.decision === 'demo');

  const nextButtonLabel = isAdmittedPathLaunchStep ? 'Start Admitted Questions' : 'Next';

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <style>{`
        .hide-admission-path-cta .rounded-xl.border.border-slate-700.bg-slate-900\/60.p-4.flex.flex-col.sm\:flex-row.sm\:items-center.sm\:justify-between.gap-3 {
          display: none;
        }
      `}</style>
      {/* Left Sidebar — Bucket Nav */}
      <div className={`${isSidebarCollapsed ? 'w-14' : 'w-52'} flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden transition-all duration-200`}>
        <div className="px-3 py-4 border-b border-slate-700">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2 mb-3`}>
            {isSidebarCollapsed ? (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="h-8 w-8 rounded-md flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Show witness and bucket sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <Tv className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">Trial Screen</span>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="h-8 w-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Hide witness and bucket sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {!isSidebarCollapsed && (
            <>
              <Select value={selectedPartyId} onValueChange={(v) => { setSelectedPartyId(v); setCurrentIndex(0); setSelectedProof(null); }}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 text-xs">
                  <SelectValue placeholder="Select party…" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
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
            </>
          )}
        </div>

        {!isSidebarCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto">
              <BucketNav
                buckets={buckets}
                currentBucketId={currentBucketId}
                flatList={flatList}
                currentIndex={currentIndex}
                onJumpToBucket={jumpToBucket}
                onJumpToIndex={(idx) => { setCurrentIndex(idx); setSelectedProof(null); }}
              />
            </div>

            <div className="px-3 py-3 border-t border-slate-700">
              <a href="/present/jury" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
                  <ExternalLink className="w-3 h-3" /> Jury View
                </Button>
              </a>
            </div>
          </>
        )}
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
          <div className="flex-1 flex gap-4 p-6 min-h-0 overflow-hidden">
            {/* Questions column */}
            <div ref={questionColumnRef} className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
              {currentItem?.type === 'block' && activeBlockFlow?.phase !== 'branch' ? (
                <div className={isAdmittedPathLaunchStep ? 'hide-admission-path-cta' : ''}>
                  <AdmissionBlockTrialPanel
                    item={currentItem}
                    index={currentIndex}
                    total={flatList.length}
                    visibleSteps={visibleBlockSteps}
                    currentStepIndex={activeBlockFlow?.stepIndex || 0}
                    decision={activeBlockFlow?.decision || null}
                    canGoPrev={(activeBlockFlow?.stepIndex || 0) > 0}
                    canGoNext={canGoNext}
                    onPrevStep={() => {
                      if ((activeBlockFlow?.stepIndex || 0) > 0) {
                        setBlockFlow((prev) => ({ ...prev, stepIndex: prev.stepIndex - 1 }));
                      }
                    }}
                    onNextStep={goNext}
                    onSelectProof={setSelectedProof}
                    onRuling={handleRuling}
                    onDecision={handleBlockDecision}
                    isRulingLoading={rulingMutation.isPending}
                    onStartPath={() => startBranch('admitted')}
                  />
                </div>
              ) : (
                <>
                  <CurrentQuestionCard
                    item={displayCurrentItem}
                    index={currentIndex}
                    total={flatList.length}
                    examType={selectedExamType}
                    onSelectProof={setSelectedProof}
                    onRuling={handleRuling}
                    isRulingLoading={rulingMutation.isPending}
                  />

                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Up Next</p>
                    <NextQuestionCard item={displayNextItem} examType={selectedExamType} onClick={goNext} />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={!canGoPrev}
                  className="gap-2 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 shrink-0"
                >
                  {nextButtonLabel} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div
              onMouseDown={startProofResize}
              className="w-3 flex-shrink-0 cursor-col-resize relative group hidden lg:flex items-center justify-center"
              title="Drag to resize proof preview"
            >
              <div className="w-px h-full bg-slate-700 group-hover:bg-blue-500 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>

            {/* Proof Preview Pane */}
            <div
              style={{ width: `${proofPaneWidth}px` }}
              className="flex-shrink-0 min-w-[280px] bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col"
            >
              <div className="px-4 py-2.5 border-b border-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proof Preview</span>
              </div>
              <div className="flex-1 min-h-0">
                <ProofPreviewPane
                  proof={selectedProof}
                  juryState={juryState}
                  onUpdateJury={updateJury}
                  onRuling={handleRuling}
                  onClose={() => setSelectedProof(null)}
                />
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