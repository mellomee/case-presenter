import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import WorkspaceToolbar from '@/components/workspace/WorkspaceToolbar.jsx';
import WorkspaceBucketList from '@/components/workspace/WorkspaceBucketList.jsx';
import WorkspaceGroupCard from '@/components/workspace/WorkspaceGroupCard.jsx';

export default function Workspace() {
  const queryClient = useQueryClient();
  const [selectedSide, setSelectedSide] = useState('Plaintiff');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => base44.entities.Party.list() });
  const { data: allBuckets = [] } = useQuery({ queryKey: ['allBuckets'], queryFn: () => base44.entities.Bucket.list() });
  const { data: questionGroups = [] } = useQuery({ queryKey: ['questionGroups'], queryFn: () => base44.entities.QuestionGroup.list() });
  const { data: questions = [] } = useQuery({ queryKey: ['allQuestions'], queryFn: () => base44.entities.Question.list() });
  const { data: admissionBlocks = [] } = useQuery({ queryKey: ['allBlocks'], queryFn: () => base44.entities.AdmissionBlock.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['allProofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['admissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });

  const sideOptions = useMemo(() => Array.from(new Set(parties.map((party) => party.side).filter(Boolean))), [parties]);
  const witnessOptions = useMemo(() => parties.filter((party) => party.side === selectedSide), [parties, selectedSide]);
  const buckets = useMemo(() => allBuckets
    .filter((bucket) => bucket.party_id === selectedPartyId && bucket.exam_type === selectedExamType)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [allBuckets, selectedPartyId, selectedExamType]);

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
    if (!buckets.length) {
      setSelectedBucketId('');
      return;
    }
    if (!buckets.some((bucket) => bucket.id === selectedBucketId)) setSelectedBucketId(buckets[0].id);
  }, [buckets, selectedBucketId]);

  const groupCountByBucket = useMemo(() => Object.fromEntries(
    buckets.map((bucket) => [bucket.id, questionGroups.filter((group) => group.bucket_id === bucket.id).length])
  ), [buckets, questionGroups]);

  const selectedGroups = useMemo(() => questionGroups
    .filter((group) => group.bucket_id === selectedBucketId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [questionGroups, selectedBucketId]);

  const createGroupMutation = useMutation({
    mutationFn: (payload) => base44.entities.QuestionGroup.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questionGroups'] }),
  });
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuestionGroup.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questionGroups'] }),
  });
  const createQuestionMutation = useMutation({
    mutationFn: (payload) => base44.entities.Question.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allQuestions'] }),
  });
  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Question.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allQuestions'] }),
  });
  const createAdmissionBlockMutation = useMutation({
    mutationFn: (payload) => base44.entities.AdmissionBlock.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allBlocks'] }),
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !selectedBucketId || !selectedPartyId) return;
    createGroupMutation.mutate({
      name: newGroupName.trim(),
      bucket_id: selectedBucketId,
      party_id: selectedPartyId,
      exam_type: selectedExamType,
      sort_order: selectedGroups.length,
    });
    setNewGroupName('');
  };

  return (
    <div className="h-full bg-slate-50 overflow-hidden">
      <div className="flex h-full flex-col">
        <WorkspaceToolbar
          sideOptions={sideOptions}
          selectedSide={selectedSide}
          onSideChange={setSelectedSide}
          witnessOptions={witnessOptions}
          selectedPartyId={selectedPartyId}
          onPartyChange={setSelectedPartyId}
          selectedExamType={selectedExamType}
          onExamTypeChange={setSelectedExamType}
        />

        <div className="flex min-h-0 flex-1">
          <WorkspaceBucketList
            buckets={buckets}
            selectedBucketId={selectedBucketId}
            onSelectBucket={setSelectedBucketId}
            groupCountByBucket={groupCountByBucket}
          />

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {!selectedBucketId ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                Pick a bucket to start building grouped questions and admission flow.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      value={newGroupName}
                      onChange={(event) => setNewGroupName(event.target.value)}
                      placeholder="New question group"
                      className="h-11 flex-1 rounded-2xl border border-slate-300 px-4 text-sm text-slate-700"
                    />
                    <button onClick={handleCreateGroup} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      Add Group
                    </button>
                  </div>
                </div>

                {selectedGroups.map((group) => {
                  const groupQuestions = questions.filter((question) => question.question_group_id === group.id);
                  const groupBlocks = admissionBlocks.filter((block) => block.question_group_id === group.id);
                  return (
                    <WorkspaceGroupCard
                      key={group.id}
                      group={group}
                      proofs={proofs}
                      questions={groupQuestions}
                      admissionBlocks={groupBlocks}
                      admissionTemplates={admissionTemplates}
                      onSaveGroup={(id, data) => updateGroupMutation.mutate({ id, data })}
                      onAddQuestion={(item) => createQuestionMutation.mutate({
                        text: 'New question',
                        type: selectedExamType,
                        party_id: selectedPartyId,
                        bucket_id: selectedBucketId,
                        question_group_id: item.id,
                        sort_order: groupQuestions.filter((question) => !question.parent_question_id).length,
                        block_type: 'Question',
                      })}
                      onAddAdmissionBlock={(item, proof) => createAdmissionBlockMutation.mutate({
                        proof_id: proof.id,
                        party_id: selectedPartyId,
                        bucket_id: selectedBucketId,
                        question_group_id: item.id,
                        sort_order: groupQuestions.filter((question) => !question.parent_question_id).length + groupBlocks.length,
                        proof_type_category_id: proof.proof_type_category_id,
                      })}
                      onSaveQuestion={(id, data) => updateQuestionMutation.mutate({ id, data })}
                      onAddFollowup={(question) => createQuestionMutation.mutate({
                        text: 'New follow-up',
                        type: selectedExamType,
                        party_id: selectedPartyId,
                        bucket_id: selectedBucketId,
                        question_group_id: group.id,
                        parent_question_id: question.id,
                        sort_order: groupQuestions.filter((item) => item.parent_question_id === question.id).length,
                        block_type: 'Question',
                      })}
                    />
                  );
                })}

                {selectedGroups.length === 0 && (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    No groups yet for this bucket.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}