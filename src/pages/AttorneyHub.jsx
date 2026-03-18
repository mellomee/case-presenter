import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import AttorneyHubTopBar from '@/components/attorneyHub/AttorneyHubTopBar.jsx';
import AttorneyHubSidebar from '@/components/attorneyHub/AttorneyHubSidebar.jsx';
import AttorneyHubDetailsPanel from '@/components/attorneyHub/AttorneyHubDetailsPanel.jsx';
import WitnessNode from '@/components/attorneyHub/nodes/WitnessNode.jsx';
import TrialPointNode from '@/components/attorneyHub/nodes/TrialPointNode.jsx';
import BucketNode from '@/components/attorneyHub/nodes/BucketNode.jsx';
import QuestionNode from '@/components/attorneyHub/nodes/QuestionNode.jsx';
import EvidenceBlockNode from '@/components/attorneyHub/nodes/EvidenceBlockNode.jsx';
import ProofNode from '@/components/attorneyHub/nodes/ProofNode.jsx';
import { buildMindMapGraph, getBucketStatus, getProofDisplayLabel } from '@/components/attorneyHub/mindMapUtils';

const nodeTypes = {
  witnessNode: WitnessNode,
  trialPointNode: TrialPointNode,
  bucketNode: BucketNode,
  questionNode: QuestionNode,
  evidenceBlockNode: EvidenceBlockNode,
  proofNode: ProofNode,
};

function buildJuryPatch(proof, previewState = {}) {
  return {
    published_proof_id: proof.id,
    is_blank: false,
    exhibit_label: getProofDisplayLabel(proof),
    pdf_page: previewState.currentPage || 1,
    zoom: previewState.zoom ?? 1,
    panX: previewState.panX ?? 0,
    panY: previewState.panY ?? 0,
    video_time: previewState.currentTime || 0,
    is_playing: !!previewState.playing,
  };
}

export default function AttorneyHub() {
  const queryClient = useQueryClient();
  const flowRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [selectedSide, setSelectedSide] = useState('Plaintiff');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [expandedBucketIds, setExpandedBucketIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutDraft, setLayoutDraft] = useState({
    node_positions: {},
    bucket_statuses: {},
    asked_question_ids: {},
    active_bucket_id: null,
    view_mode: 'expanded',
  });
  const [linkDraft, setLinkDraft] = useState({ proofId: '', nodeLabel: '', whyItMatters: '' });
  const [previewState, setPreviewState] = useState({ currentPage: 1, zoom: 1, panX: 0, panY: 0, currentTime: 0, playing: false });
  const [liveSync, setLiveSync] = useState(false);

  const { juryState, update: updateJury } = useJurySync('attorney');

  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => base44.entities.Party.list() });
  const { data: trialPoints = [] } = useQuery({ queryKey: ['trialPoints'], queryFn: () => base44.entities.TrialPoint.list() });
  const { data: allBuckets = [] } = useQuery({ queryKey: ['allBuckets'], queryFn: () => base44.entities.Bucket.list() });
  const { data: allQuestions = [] } = useQuery({ queryKey: ['allQuestions'], queryFn: () => base44.entities.Question.list() });
  const { data: allProofs = [] } = useQuery({ queryKey: ['allProofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: allBlocks = [] } = useQuery({ queryKey: ['allBlocks'], queryFn: () => base44.entities.AdmissionBlock.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['admissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });
  const { data: allBucketProofLinks = [] } = useQuery({ queryKey: ['bucketProofLinks'], queryFn: () => base44.entities.BucketProofLink.list() });
  const { data: currentLayouts = [] } = useQuery({
    queryKey: ['mindMapLayouts', selectedPartyId, selectedExamType],
    enabled: !!selectedPartyId,
    queryFn: () => base44.entities.MindMapLayout.filter({ party_id: selectedPartyId, exam_type: selectedExamType }),
  });

  const currentLayout = currentLayouts[0] || null;
  const compactMode = layoutDraft.view_mode === 'compact';

  const sideOptions = useMemo(() => Array.from(new Set(parties.map((party) => party.side).filter(Boolean))), [parties]);
  const witnessOptions = useMemo(() => parties.filter((party) => party.side === selectedSide), [parties, selectedSide]);
  const selectedParty = useMemo(() => witnessOptions.find((party) => party.id === selectedPartyId) || null, [witnessOptions, selectedPartyId]);

  useEffect(() => {
    if (sideOptions.length > 0 && !sideOptions.includes(selectedSide)) {
      setSelectedSide(sideOptions[0]);
    }
  }, [sideOptions, selectedSide]);

  useEffect(() => {
    if (!witnessOptions.length) {
      setSelectedPartyId('');
      return;
    }
    if (!witnessOptions.some((party) => party.id === selectedPartyId)) {
      setSelectedPartyId(witnessOptions[0].id);
    }
  }, [witnessOptions, selectedPartyId]);

  useEffect(() => {
    setExpandedBucketIds([]);
    setSelectedNodeId(selectedPartyId ? `witness-${selectedPartyId}` : null);
    setLinkDraft({ proofId: '', nodeLabel: '', whyItMatters: '' });
    setSearchQuery('');
    setLiveSync(false);
  }, [selectedPartyId, selectedExamType]);

  useEffect(() => {
    if (currentLayout) {
      setLayoutDraft({
        node_positions: currentLayout.node_positions || {},
        bucket_statuses: currentLayout.bucket_statuses || {},
        asked_question_ids: currentLayout.asked_question_ids || {},
        active_bucket_id: currentLayout.active_bucket_id || null,
        view_mode: currentLayout.view_mode || 'expanded',
      });
    } else {
      setLayoutDraft({
        node_positions: {},
        bucket_statuses: {},
        asked_question_ids: {},
        active_bucket_id: null,
        view_mode: 'expanded',
      });
    }
  }, [currentLayout?.id, selectedPartyId, selectedExamType]);

  const buckets = useMemo(() => allBuckets
    .filter((bucket) => bucket.party_id === selectedPartyId && bucket.exam_type === selectedExamType)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [allBuckets, selectedPartyId, selectedExamType]);

  const bucketIds = useMemo(() => new Set(buckets.map((bucket) => bucket.id)), [buckets]);
  const questions = useMemo(() => allQuestions
    .filter((question) => question.party_id === selectedPartyId && question.type === selectedExamType && bucketIds.has(question.bucket_id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [allQuestions, selectedPartyId, selectedExamType, bucketIds]);
  const admissionBlocks = useMemo(() => allBlocks
    .filter((block) => block.party_id === selectedPartyId && bucketIds.has(block.bucket_id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [allBlocks, selectedPartyId, bucketIds]);
  const bucketProofLinks = useMemo(() => allBucketProofLinks.filter((link) => bucketIds.has(link.bucket_id)), [allBucketProofLinks, bucketIds]);

  const saveLayoutMutation = useMutation({
    mutationFn: (payload) => currentLayout
      ? base44.entities.MindMapLayout.update(currentLayout.id, payload)
      : base44.entities.MindMapLayout.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mindMapLayouts', selectedPartyId, selectedExamType] }),
  });

  const createBucketProofLinkMutation = useMutation({
    mutationFn: (payload) => base44.entities.BucketProofLink.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bucketProofLinks'] }),
  });

  const deleteBucketProofLinkMutation = useMutation({
    mutationFn: (id) => base44.entities.BucketProofLink.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bucketProofLinks'] }),
  });

  const persistLayout = useCallback((nextLayout) => {
    if (!selectedPartyId) return;
    saveLayoutMutation.mutate({
      party_id: selectedPartyId,
      exam_type: selectedExamType,
      node_positions: nextLayout.node_positions || {},
      bucket_statuses: nextLayout.bucket_statuses || {},
      asked_question_ids: nextLayout.asked_question_ids || {},
      active_bucket_id: nextLayout.active_bucket_id || null,
      view_mode: nextLayout.view_mode || 'expanded',
    });
  }, [saveLayoutMutation, selectedPartyId, selectedExamType]);

  const updateLayoutDraft = useCallback((updater, debounce = false) => {
    setLayoutDraft((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : { ...previous, ...updater };
      if (debounce) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => persistLayout(next), 300);
      } else {
        persistLayout(next);
      }
      return next;
    });
  }, [persistLayout]);

  const graph = useMemo(() => buildMindMapGraph({
    party: selectedParty,
    trialPoints,
    buckets,
    questions,
    proofs: allProofs,
    admissionBlocks,
    bucketProofLinks,
    layoutDraft,
    compactMode,
    expandedBucketIds,
    selectedNodeId,
    juryState,
  }), [selectedParty, trialPoints, buckets, questions, allProofs, admissionBlocks, bucketProofLinks, layoutDraft, compactMode, expandedBucketIds, selectedNodeId, juryState]);

  const bucketMetaById = useMemo(() => Object.fromEntries(
    buckets.map((bucket) => {
      const item = graph.lookup[`bucket-${bucket.id}`];
      const statusLabel = getBucketStatus(bucket.id, layoutDraft);
      return [bucket.id, {
        questionCount: item?.questions?.length || 0,
        proofCount: item?.linkedProofs?.length || 0,
        hasProof: (item?.linkedProofs?.length || 0) > 0,
        needsAdmission: !!item?.needsAdmission,
        statusLabel,
        statusTone: statusLabel === 'Done' ? 'green' : statusLabel === 'Active' ? 'blue' : statusLabel === 'Skipped' ? 'red' : 'slate',
      }];
    })
  ), [buckets, graph.lookup, layoutDraft]);

  const selectedItem = graph.lookup[selectedNodeId] || null;
  const nextSiblingBucket = useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'bucket') return null;
    const siblings = buckets.filter((bucket) => bucket.trial_point_id === selectedItem.bucket.trial_point_id);
    const index = siblings.findIndex((bucket) => bucket.id === selectedItem.bucket.id);
    return siblings[index + 1] || null;
  }, [selectedItem, buckets]);

  useEffect(() => {
    const previewProof = selectedItem?.type === 'proof'
      ? selectedItem.proof
      : selectedItem?.type === 'evidenceBlock'
        ? selectedItem.proof
        : selectedItem?.type === 'bucket'
          ? selectedItem.linkedProofs?.[0] || null
          : selectedItem?.type === 'question'
            ? selectedItem.linkedProofs?.[0] || null
            : null;

    if (!previewProof) {
      setPreviewState({ currentPage: 1, zoom: 1, panX: 0, panY: 0, currentTime: 0, playing: false });
      return;
    }

    setPreviewState({ currentPage: 1, zoom: 1, panX: 0, panY: 0, currentTime: 0, playing: false });
  }, [selectedItem?.type, selectedItem?.proof?.id, selectedItem?.bucket?.id, selectedItem?.question?.id]);

  const centerNode = useCallback((nodeId) => {
    const node = graph.nodes.find((item) => item.id === nodeId);
    if (!node || !flowRef.current) return;
    flowRef.current.setCenter(node.position.x + 90, node.position.y + 60, { zoom: 0.95, duration: 350 });
  }, [graph.nodes]);

  const focusNode = useCallback((nodeId) => {
    const bucketMatch = nodeId.match(/^bucket-(.+)$/);
    const questionMatch = nodeId.startsWith('question::') ? nodeId.split('::') : null;
    const blockMatch = nodeId.startsWith('block::') ? nodeId.split('::') : null;
    const proofMatch = nodeId.startsWith('proof::') ? nodeId.split('::') : null;

    if (bucketMatch) {
      setExpandedBucketIds([bucketMatch[1]]);
    }
    if (questionMatch) {
      setExpandedBucketIds([questionMatch[1]]);
    }
    if (blockMatch) {
      setExpandedBucketIds([blockMatch[1]]);
    }
    if (proofMatch) {
      setExpandedBucketIds([proofMatch[1]]);
    }

    setSelectedNodeId(nodeId);
    setTimeout(() => centerNode(nodeId), 80);
  }, [centerNode]);

  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return graph.searchIndex
      .filter((item) => item.label.toLowerCase().includes(term) || item.subtitle.toLowerCase().includes(term))
      .slice(0, 8);
  }, [graph.searchIndex, searchQuery]);

  const handleNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    const bucketMatch = node.id.match(/^bucket-(.+)$/);
    if (bucketMatch) setExpandedBucketIds([bucketMatch[1]]);
  }, []);

  const handleNodeDragStop = useCallback((_, node) => {
    updateLayoutDraft((previous) => ({
      ...previous,
      node_positions: {
        ...previous.node_positions,
        [node.id]: { x: node.position.x, y: node.position.y },
      },
    }), true);
  }, [updateLayoutDraft]);

  const handleBucketStatusChange = useCallback((bucketId, status) => {
    updateLayoutDraft((previous) => ({
      ...previous,
      bucket_statuses: {
        ...previous.bucket_statuses,
        [bucketId]: status,
      },
      active_bucket_id: status === 'Active' ? bucketId : previous.active_bucket_id === bucketId ? null : previous.active_bucket_id,
    }));
  }, [updateLayoutDraft]);

  const handleMarkQuestionAsked = useCallback((questionId) => {
    updateLayoutDraft((previous) => ({
      ...previous,
      asked_question_ids: {
        ...previous.asked_question_ids,
        [questionId]: true,
      },
    }));
  }, [updateLayoutDraft]);

  const handleCreateProofLink = useCallback(() => {
    if (!selectedItem || selectedItem.type !== 'bucket' || !linkDraft.proofId) return;
    createBucketProofLinkMutation.mutate({
      bucket_id: selectedItem.bucket.id,
      proof_id: linkDraft.proofId,
      node_label: linkDraft.nodeLabel || null,
      why_it_matters: linkDraft.whyItMatters || null,
      sort_order: selectedItem.linkedProofEntries.length,
    });
    setLinkDraft({ proofId: '', nodeLabel: '', whyItMatters: '' });
    setExpandedBucketIds([selectedItem.bucket.id]);
  }, [selectedItem, linkDraft, createBucketProofLinkMutation]);

  const handlePreviewStateChange = useCallback((patch) => {
    setPreviewState((previous) => {
      const next = { ...previous, ...patch };
      const previewProof = selectedItem?.type === 'proof'
        ? selectedItem.proof
        : selectedItem?.type === 'evidenceBlock'
          ? selectedItem.proof
          : selectedItem?.type === 'bucket'
            ? selectedItem.linkedProofs?.[0] || null
            : selectedItem?.type === 'question'
              ? selectedItem.linkedProofs?.[0] || null
              : null;

      if (liveSync && previewProof && juryState?.published_proof_id === previewProof.id && !juryState?.is_blank) {
        updateJury(buildJuryPatch(previewProof, next));
      }
      return next;
    });
  }, [selectedItem, liveSync, juryState, updateJury]);

  const handlePublishProof = useCallback((proof) => {
    updateJury(buildJuryPatch(proof, previewState));
  }, [updateJury, previewState]);

  const handleBlankJury = useCallback(() => {
    updateJury({ is_blank: true, published_proof_id: null, exhibit_label: '' });
  }, [updateJury]);

  const handleFitView = useCallback(() => {
    flowRef.current?.fitView({ padding: 0.18, duration: 350 });
  }, []);

  const proofOptions = useMemo(() => allProofs
    .filter((proof) => !selectedItem || selectedItem.type !== 'bucket' || !selectedItem.linkedProofEntries.some((entry) => entry.proof_id === proof.id))
    .sort((a, b) => (a.formal_name || a.name || '').localeCompare(b.formal_name || b.name || '')), [allProofs, selectedItem]);

  return (
    <div className="h-full bg-slate-50 overflow-hidden">
      <div className="flex h-full flex-col">
        <AttorneyHubTopBar
          sideOptions={sideOptions}
          selectedSide={selectedSide}
          onSideChange={setSelectedSide}
          witnessOptions={witnessOptions}
          selectedPartyId={selectedPartyId}
          onPartyChange={setSelectedPartyId}
          selectedExamType={selectedExamType}
          onExamTypeChange={setSelectedExamType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onSearchSelect={(result) => {
            setSearchQuery('');
            focusNode(result.nodeId);
          }}
          compactMode={compactMode}
          onToggleCompact={() => updateLayoutDraft((previous) => ({
            ...previous,
            view_mode: previous.view_mode === 'compact' ? 'expanded' : 'compact',
          }))}
          onFitView={handleFitView}
          onCollapseAll={() => setExpandedBucketIds([])}
        />

        {!selectedParty ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">Choose a witness to open the mind map.</div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <AttorneyHubSidebar
              sidebarGroups={graph.sidebarGroups}
              selectedNodeId={selectedNodeId}
              onFocusNode={focusNode}
              bucketMetaById={bucketMetaById}
            />

            <div className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top,_#ffffff,_#eff6ff_40%,_#eef2ff_75%)]">
              <ReactFlow
                nodes={graph.nodes}
                edges={graph.edges.map((edge) => ({
                  ...edge,
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed, color: edge.style?.stroke || '#94a3b8' },
                }))}
                nodeTypes={nodeTypes}
                onInit={(instance) => {
                  flowRef.current = instance;
                  instance.fitView({ padding: 0.18 });
                }}
                onNodeClick={handleNodeClick}
                onNodeDragStop={handleNodeDragStop}
                onPaneClick={() => setSelectedNodeId(null)}
                fitView
                panOnDrag
                zoomOnScroll
                zoomOnPinch
                minZoom={0.25}
                maxZoom={1.8}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#cbd5e1" gap={28} size={1.2} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>

            <AttorneyHubDetailsPanel
              selectedItem={selectedItem}
              proofOptions={proofOptions}
              linkDraft={linkDraft}
              setLinkDraft={setLinkDraft}
              onCreateProofLink={handleCreateProofLink}
              onDeleteProofLink={(id) => deleteBucketProofLinkMutation.mutate(id)}
              onSelectNode={focusNode}
              onBucketStatusChange={handleBucketStatusChange}
              nextSiblingBucket={nextSiblingBucket}
              onMarkQuestionAsked={handleMarkQuestionAsked}
              admissionTemplates={admissionTemplates}
              juryState={juryState}
              liveSync={liveSync}
              onToggleLiveSync={() => setLiveSync((value) => !value)}
              onPublishProof={handlePublishProof}
              onBlankJury={handleBlankJury}
              onPreviewStateChange={handlePreviewStateChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}