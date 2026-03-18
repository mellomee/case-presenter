import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import { getBlockOutcome, getBucketStatus } from '@/components/attorneyHub/mindMapUtils';
import HubToolbar from '@/components/attorneyHubBoard/HubToolbar.jsx';
import BucketRail from '@/components/attorneyHubBoard/BucketRail.jsx';
import GroupCard from '@/components/attorneyHubBoard/GroupCard.jsx';
import HubRightPanel from '@/components/attorneyHubBoard/HubRightPanel.jsx';

function buildJuryPatch(proof, previewState = {}) {
  return {
    published_proof_id: proof.id,
    is_blank: false,
    exhibit_label: proof.formal_name || proof.name,
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
  const [selectedSide, setSelectedSide] = useState('Plaintiff');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedProofId, setSelectedProofId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutDraft, setLayoutDraft] = useState({
    bucket_statuses: {},
    asked_question_ids: {},
    block_outcomes: {},
    active_bucket_id: null,
    view_mode: 'expanded',
  });
  const [previewState, setPreviewState] = useState({ currentPage: 1, zoom: 1, panX: 0, panY: 0, currentTime: 0, playing: false });
  const [liveSync, setLiveSync] = useState(false);

  const { juryState, update: updateJury } = useJurySync('attorney');

  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => base44.entities.Party.list() });
  const { data: allBuckets = [] } = useQuery({ queryKey: ['allBuckets'], queryFn: () => base44.entities.Bucket.list() });
  const { data: allQuestionGroups = [] } = useQuery({ queryKey: ['questionGroups'], queryFn: () => base44.entities.QuestionGroup.list() });
  const { data: allQuestions = [] } = useQuery({ queryKey: ['allQuestions'], queryFn: () => base44.entities.Question.list() });
  const { data: allBlocks = [] } = useQuery({ queryKey: ['allBlocks'], queryFn: () => base44.entities.AdmissionBlock.list() });
  const { data: allProofs = [] } = useQuery({ queryKey: ['allProofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: proofFocuses = [] } = useQuery({ queryKey: ['proofFocuses'], queryFn: () => base44.entities.ProofFocus.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['admissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });
  const { data: currentLayouts = [] } = useQuery({
    queryKey: ['mindMapLayouts', selectedPartyId, selectedExamType],
    enabled: !!selectedPartyId,
    queryFn: () => base44.entities.MindMapLayout.filter({ party_id: selectedPartyId, exam_type: selectedExamType }),
  });

  const currentLayout = currentLayouts[0] || null;

  const sideOptions = useMemo(() => Array.from(new Set(parties.map((party) => party.side).filter(Boolean))), [parties]);
  const witnessOptions = useMemo(() => parties.filter((party) => party.side === selectedSide), [parties, selectedSide]);
  const partyMap = useMemo(() => new Map(parties.map((party) => [party.id, party])), [parties]);
  const proofMap = useMemo(() => new Map(allProofs.map((proof) => [proof.id, proof])), [allProofs]);

  useEffect(() => {
    if (sideOptions.length > 0 && !sideOptions.includes(selectedSide)) setSelectedSide(sideOptions[0]);
  }, [sideOptions, selectedSide]);

  useEffect(() => {
    if (!witnessOptions.length) {
      setSelectedPartyId('');
      return;
    }
    if (!witnessOptions.some((party) => party.id === selectedPartyId)) setSelectedPartyId(witnessOptions[0].id);
  }, [witnessOptions, selectedPartyId]);

  useEffect(() => {
    if (currentLayout) {
      setLayoutDraft({
        bucket_statuses: currentLayout.bucket_statuses || {},
        asked_question_ids: currentLayout.asked_question_ids || {},
        block_outcomes: currentLayout.block_outcomes || {},
        active_bucket_id: currentLayout.active_bucket_id || null,
        view_mode: currentLayout.view_mode || 'expanded',
      });
    } else {
      setLayoutDraft({
        bucket_statuses: {},
        asked_question_ids: {},
        block_outcomes: {},
        active_bucket_id: null,
        view_mode: 'expanded',
      });
    }
  }, [currentLayout?.id, selectedPartyId, selectedExamType]);

  const buckets = useMemo(() => allBuckets.filter((bucket) => bucket.party_id === selectedPartyId && bucket.exam_type === selectedExamType).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [allBuckets, selectedPartyId, selectedExamType]);

  useEffect(() => {
    if (!buckets.length) {
      setSelectedBucketId('');
      return;
    }
    if (!buckets.some((bucket) => bucket.id === selectedBucketId)) setSelectedBucketId(buckets[0].id);
  }, [buckets, selectedBucketId]);

  const groups = useMemo(() => allQuestionGroups.filter((group) => group.party_id === selectedPartyId && group.exam_type === selectedExamType && group.bucket_id === selectedBucketId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [allQuestionGroups, selectedPartyId, selectedExamType, selectedBucketId]);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId('');
      return;
    }
    if (!groups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

  const questionsByGroup = useMemo(() => Object.fromEntries(groups.map((group) => [group.id, allQuestions.filter((question) => question.question_group_id === group.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))])), [groups, allQuestions]);
  const blocksByGroup = useMemo(() => Object.fromEntries(groups.map((group) => [group.id, allBlocks.filter((block) => block.question_group_id === group.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))])), [groups, allBlocks]);
  const focusesByGroup = useMemo(() => Object.fromEntries(groups.map((group) => [group.id, proofFocuses.filter((focus) => focus.question_group_id === group.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))])), [groups, proofFocuses]);

  const saveLayoutMutation = useMutation({
    mutationFn: (payload) => currentLayout
      ? base44.entities.MindMapLayout.update(currentLayout.id, payload)
      : base44.entities.MindMapLayout.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mindMapLayouts', selectedPartyId, selectedExamType] }),
  });

  const proofStatusMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allProofs'] }),
  });

  const persistLayout = useCallback((nextLayout) => {
    if (!selectedPartyId) return;
    saveLayoutMutation.mutate({
      party_id: selectedPartyId,
      exam_type: selectedExamType,
      bucket_statuses: nextLayout.bucket_statuses || {},
      asked_question_ids: nextLayout.asked_question_ids || {},
      block_outcomes: nextLayout.block_outcomes || {},
      active_bucket_id: nextLayout.active_bucket_id || null,
      view_mode: nextLayout.view_mode || 'expanded',
    });
  }, [saveLayoutMutation, selectedPartyId, selectedExamType]);

  const updateLayoutDraft = useCallback((updater) => {
    setLayoutDraft((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : { ...previous, ...updater };
      persistLayout(next);
      return next;
    });
  }, [persistLayout]);

  const bucketMetaById = useMemo(() => Object.fromEntries(
    buckets.map((bucket) => {
      const bucketGroups = allQuestionGroups.filter((group) => group.bucket_id === bucket.id);
      const bucketBlocks = allBlocks.filter((block) => block.bucket_id === bucket.id);
      const status = getBucketStatus(bucket.id, layoutDraft);
      return [bucket.id, {
        status,
        groupCount: bucketGroups.length,
        blockCount: bucketBlocks.length,
        hasProof: bucketGroups.some((group) => !!group.proof_id) || proofFocuses.some((focus) => focus.bucket_id === bucket.id),
        needsAdmission: bucketBlocks.some((block) => getBlockOutcome(block, proofMap.get(block.proof_id), layoutDraft) === 'needs_admission'),
      }];
    })
  ), [buckets, allQuestionGroups, allBlocks, layoutDraft, proofFocuses, proofMap]);

  const selectedBucket = buckets.find((bucket) => bucket.id === selectedBucketId) || null;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const selectedBlock = selectedGroup ? (blocksByGroup[selectedGroup.id] || []).find((block) => block.id === selectedBlockId) || null : null;
  const selectedProof = selectedProofId ? proofMap.get(selectedProofId) || null : null;

  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    const bucketResults = buckets.map((bucket) => ({ id: `bucket-${bucket.id}`, type: 'bucket', label: bucket.name, subtitle: 'Bucket', bucketId: bucket.id }));
    const groupResults = allQuestionGroups.filter((group) => group.party_id === selectedPartyId && group.exam_type === selectedExamType).map((group) => ({ id: `group-${group.id}`, type: 'group', label: group.node_label || group.name, subtitle: buckets.find((bucket) => bucket.id === group.bucket_id)?.name || 'Group', bucketId: group.bucket_id, groupId: group.id }));
    const questionResults = allQuestions.filter((question) => question.party_id === selectedPartyId && question.type === selectedExamType).map((question) => ({ id: `question-${question.id}`, type: 'question', label: question.text, subtitle: allQuestionGroups.find((group) => group.id === question.question_group_id)?.name || 'Question', bucketId: question.bucket_id, groupId: question.question_group_id }));
    const proofResults = proofFocuses.filter((focus) => focus.party_id === selectedPartyId).map((focus) => ({ id: `focus-${focus.id}`, type: 'proof', label: focus.label || proofMap.get(focus.proof_id)?.formal_name || proofMap.get(focus.proof_id)?.name || 'Proof', subtitle: allQuestionGroups.find((group) => group.id === focus.question_group_id)?.name || 'Proof', bucketId: focus.bucket_id, groupId: focus.question_group_id, proofId: focus.proof_id }));
    return [...bucketResults, ...groupResults, ...questionResults, ...proofResults]
      .filter((item) => item.label.toLowerCase().includes(term) || item.subtitle.toLowerCase().includes(term))
      .slice(0, 8);
  }, [searchQuery, buckets, allQuestionGroups, allQuestions, proofFocuses, proofMap, selectedPartyId, selectedExamType]);

  const handleToggleAsked = useCallback((questionId) => {
    updateLayoutDraft((previous) => ({
      ...previous,
      asked_question_ids: {
        ...previous.asked_question_ids,
        [questionId]: !previous.asked_question_ids?.[questionId],
      },
    }));
  }, [updateLayoutDraft]);

  const handleSetBlockOutcome = useCallback((block, outcome) => {
    const proof = proofMap.get(block.proof_id);
    updateLayoutDraft((previous) => ({
      ...previous,
      block_outcomes: {
        ...previous.block_outcomes,
        [block.id]: outcome,
      },
    }));
    if (!proof) return;
    if (outcome === 'admitted') proofStatusMutation.mutate({ proofId: proof.id, data: { status: 'Admitted' } });
    if (outcome === 'demonstrative') proofStatusMutation.mutate({ proofId: proof.id, data: { status: 'Demonstrative' } });
    if (outcome === 'needs_admission' && ['Admitted', 'Demonstrative'].includes(proof.status)) {
      proofStatusMutation.mutate({ proofId: proof.id, data: proof.status === 'Admitted' ? { status: 'Joint', admitted_exhibit_num: null, admitted_by: null, admit_date: null } : { status: 'Joint', demonstrative_exhibit_num: null } });
    }
  }, [updateLayoutDraft, proofMap, proofStatusMutation]);

  const handlePreviewStateChange = useCallback((patch) => {
    setPreviewState((previous) => {
      const next = { ...previous, ...patch };
      const previewProof = selectedProof || (selectedBlock ? proofMap.get(selectedBlock.proof_id) : selectedGroup?.proof_id ? proofMap.get(selectedGroup.proof_id) : null);
      if (liveSync && previewProof && juryState?.published_proof_id === previewProof.id && !juryState?.is_blank) {
        updateJury(buildJuryPatch(previewProof, next));
      }
      return next;
    });
  }, [selectedProof, selectedBlock, selectedGroup, proofMap, liveSync, juryState, updateJury]);

  const handlePublishProof = useCallback((proof) => {
    updateJury(buildJuryPatch(proof, previewState));
  }, [updateJury, previewState]);

  const handleBlankJury = useCallback(() => {
    updateJury({ is_blank: true, published_proof_id: null, exhibit_label: '' });
  }, [updateJury]);

  return (
    <div className="h-full bg-slate-50 overflow-hidden">
      <div className="flex h-full flex-col">
        <HubToolbar
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
            if (result.bucketId) setSelectedBucketId(result.bucketId);
            if (result.groupId) setSelectedGroupId(result.groupId);
            if (result.proofId) setSelectedProofId(result.proofId);
          }}
        />

        <div className="flex min-h-0 flex-1">
          <BucketRail buckets={buckets} selectedBucketId={selectedBucketId} onSelectBucket={(bucketId) => { setSelectedBucketId(bucketId); setSelectedGroupId(''); setSelectedBlockId(''); setSelectedProofId(''); }} metaByBucket={bucketMetaById} />

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {!selectedBucket ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Choose a bucket to open the attorney flow.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[30px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{selectedBucket.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Open a group, see the proof need, admit fast, then run the checklist.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateLayoutDraft((previous) => ({ ...previous, bucket_statuses: { ...previous.bucket_statuses, [selectedBucket.id]: 'Active' }, active_bucket_id: selectedBucket.id }))} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Start Bucket</button>
                      <button onClick={() => updateLayoutDraft((previous) => ({ ...previous, bucket_statuses: { ...previous.bucket_statuses, [selectedBucket.id]: 'Done' }, active_bucket_id: previous.active_bucket_id === selectedBucket.id ? null : previous.active_bucket_id }))} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Mark Done</button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      questions={questionsByGroup[group.id] || []}
                      proofFocuses={focusesByGroup[group.id] || []}
                      admissionBlocks={blocksByGroup[group.id] || []}
                      proofMap={proofMap}
                      partyMap={partyMap}
                      askedQuestionIds={layoutDraft.asked_question_ids || {}}
                      onToggleAsked={handleToggleAsked}
                      onSelectProof={(proofId) => { setSelectedGroupId(group.id); setSelectedBlockId(''); setSelectedProofId(proofId); }}
                      onOpenBlock={(blockId) => { setSelectedGroupId(group.id); setSelectedBlockId(blockId); setSelectedProofId(''); }}
                      onSetBlockOutcome={handleSetBlockOutcome}
                      selected={group.id === selectedGroupId}
                      onSelectGroup={() => { setSelectedGroupId(group.id); setSelectedBlockId(''); setSelectedProofId(group.proof_id || ''); }}
                      blockOutcomes={layoutDraft.block_outcomes || {}}
                    />
                  ))}
                  {groups.length === 0 && <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">No question groups in this bucket yet. Build them in Workspace.</div>}
                </div>
              </div>
            )}
          </div>

          <HubRightPanel
            selectedBucket={selectedBucket}
            selectedGroup={selectedGroup ? { ...selectedGroup, focusProof: selectedGroup.proof_id ? proofMap.get(selectedGroup.proof_id) : null } : null}
            selectedBlock={selectedBlock ? { block: selectedBlock, proof: proofMap.get(selectedBlock.proof_id) } : null}
            selectedProof={selectedProof}
            admissionTemplates={admissionTemplates}
            juryState={juryState}
            liveSync={liveSync}
            onToggleLiveSync={() => setLiveSync((value) => !value)}
            onPublishProof={handlePublishProof}
            onBlankJury={handleBlankJury}
            onPreviewStateChange={handlePreviewStateChange}
          />
        </div>
      </div>
    </div>
  );
}