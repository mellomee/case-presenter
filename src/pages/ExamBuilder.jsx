import React, { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PartySelector from '@/components/examBuilder/PartySelector.jsx';
import ExamTypeToggle from '@/components/examBuilder/ExamTypeToggle.jsx';
import BucketList from '@/components/examBuilder/BucketList.jsx';
import BucketModal from '@/components/examBuilder/BucketModal.jsx';
import QuestionModal from '@/components/examBuilder/QuestionModal.jsx';
import AdmissionBlockModal from '@/components/examBuilder/AdmissionBlockModal.jsx';

export default function ExamBuilder() {
  const queryClient = useQueryClient();
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedExamType, setSelectedExamType] = useState('Direct');

  // Bucket modal state
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [editingBucket, setEditingBucket] = useState(null);

  // Question modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionBucket, setQuestionBucket] = useState(null);
  const [parentQuestion, setParentQuestion] = useState(null);

  // Admission block modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockBucket, setBlockBucket] = useState(null);

  // Error state
  const [deleteError, setDeleteError] = useState(null);
  const [showDeleteError, setShowDeleteError] = useState(false);

  // ── Data fetching ──────────────────────────────────────
  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: buckets = [] } = useQuery({
    queryKey: ['buckets', selectedParty?.id, selectedExamType],
    queryFn: async () => {
      if (!selectedParty) return [];
      const allBuckets = await base44.entities.Bucket.list();
      return allBuckets
        .filter((b) => b.party_id === selectedParty.id && b.exam_type === selectedExamType)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
    enabled: !!selectedParty,
  });

  const { data: trialPoints = [] } = useQuery({
    queryKey: ['trialPoints'],
    queryFn: () => base44.entities.TrialPoint.list(),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', selectedParty?.id, selectedExamType],
    queryFn: async () => {
      if (!selectedParty) return [];
      const all = await base44.entities.Question.list();
      return all.filter((q) => q.party_id === selectedParty.id && q.type === selectedExamType);
    },
    enabled: !!selectedParty,
  });

  const { data: admissionBlocks = [] } = useQuery({
    queryKey: ['admissionBlocks'],
    queryFn: () => base44.entities.AdmissionBlock.list(),
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list(),
  });

  const { data: proofTypeCategories = [] } = useQuery({
    queryKey: ['proofTypeCategories'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  // ── Bucket mutations ────────────────────────────────────
  const bucketMutation = useMutation({
    mutationFn: async (data) => {
      if (editingBucket) return base44.entities.Bucket.update(editingBucket.id, data);
      return base44.entities.Bucket.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      setShowBucketModal(false);
      setEditingBucket(null);
    },
  });

  const deleteBucketMutation = useMutation({
    mutationFn: async (bucketId) => {
      const attachedQuestions = questions.filter((q) => q.bucket_id === bucketId);
      const attachedBlocks = admissionBlocks.filter((ab) => ab.bucket_id === bucketId);
      if (attachedQuestions.length > 0 || attachedBlocks.length > 0) {
        throw new Error(
          `This Bucket contains ${attachedQuestions.length} questions and ${attachedBlocks.length} admission blocks. Delete or move them first.`
        );
      }
      return base44.entities.Bucket.delete(bucketId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buckets'] }),
    onError: (error) => {
      setDeleteError(error.message);
      setShowDeleteError(true);
    },
  });

  const reorderBucketMutation = useMutation({
    mutationFn: (bucketsInOrder) =>
      Promise.all(bucketsInOrder.map((b, idx) => base44.entities.Bucket.update(b.id, { sort_order: idx }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buckets'] }),
  });

  // ── Question mutations ──────────────────────────────────
  const questionMutation = useMutation({
    mutationFn: async (data) => {
      if (editingQuestion) return base44.entities.Question.update(editingQuestion.id, data);
      return base44.entities.Question.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setShowQuestionModal(false);
      setEditingQuestion(null);
      setParentQuestion(null);
      setQuestionBucket(null);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (question) => {
      const children = questions.filter((q) => q.parent_question_id === question.id);
      if (children.length > 0) {
        throw new Error(`Delete all ${children.length} follow-up question${children.length !== 1 ? 's' : ''} first.`);
      }
      return base44.entities.Question.delete(question.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
    onError: (error) => {
      setDeleteError(error.message);
      setShowDeleteError(true);
    },
  });

  // ── Admission block mutations ───────────────────────────
  const blockMutation = useMutation({
    mutationFn: async (data) => {
      if (editingBlock) return base44.entities.AdmissionBlock.update(editingBlock.id, data);
      return base44.entities.AdmissionBlock.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissionBlocks'] });
      setShowBlockModal(false);
      setEditingBlock(null);
      setBlockBucket(null);
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (block) => base44.entities.AdmissionBlock.delete(block.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admissionBlocks'] }),
    onError: (error) => {
      setDeleteError(error.message);
      setShowDeleteError(true);
    },
  });

  const reorderQuestionMutation = useMutation({
    mutationFn: (questionsInOrder) =>
      Promise.all(questionsInOrder.map((q, idx) => base44.entities.Question.update(q.id, { sort_order: idx }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });

  // ── Bucket handlers ─────────────────────────────────────
  const handleSaveBucket = (data) => {
    bucketMutation.mutate({
      ...data,
      party_id: selectedParty.id,
      exam_type: selectedExamType,
      sort_order: editingBucket ? editingBucket.sort_order : buckets.length,
    });
  };

  const handleDeleteBucket = (bucketId) => {
    if (confirm('Are you sure you want to delete this bucket?')) {
      deleteBucketMutation.mutate(bucketId);
    }
  };

  // ── Question handlers ───────────────────────────────────
  const openAddQuestion = (bucket) => {
    setEditingQuestion(null);
    setParentQuestion(null);
    setQuestionBucket(bucket);
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question) => {
    const bucket = buckets.find((b) => b.id === question.bucket_id) || null;
    setEditingQuestion(question);
    setParentQuestion(null);
    setQuestionBucket(bucket);
    setShowQuestionModal(true);
  };

  const openAddChildQuestion = (parent) => {
    const bucket = buckets.find((b) => b.id === parent.bucket_id) || null;
    setEditingQuestion(null);
    setParentQuestion(parent);
    setQuestionBucket(bucket);
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = (question) => {
    if (confirm('Delete this question?')) {
      deleteQuestionMutation.mutate(question);
    }
  };

  if (!selectedParty) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Exam Builder</h1>
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">Select a party to begin building the exam</p>
            <PartySelector parties={parties} selectedParty={selectedParty} onSelect={setSelectedParty} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Exam Builder</h1>
            <p className="text-sm text-slate-600 mt-1">
              {selectedParty.first_name} {selectedParty.last_name}
            </p>
          </div>
          <PartySelector parties={parties} selectedParty={selectedParty} onSelect={setSelectedParty} />
        </div>

        {/* Exam Type Toggle */}
        <div className="mb-6">
          <ExamTypeToggle selectedType={selectedExamType} onSelect={setSelectedExamType} />
        </div>

        {/* Buckets Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900">
              {selectedExamType === 'Direct' ? '🟢' : '🔴'} Buckets
            </h2>
            <Button
              onClick={() => { setEditingBucket(null); setShowBucketModal(true); }}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Bucket
            </Button>
          </div>

          {buckets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No buckets yet. Create one to get started.</p>
            </div>
          ) : (
            <BucketList
              buckets={buckets}
              trialPoints={trialPoints}
              questions={questions}
              proofs={proofs}
              examType={selectedExamType}
              onEdit={(bucket) => { setEditingBucket(bucket); setShowBucketModal(true); }}
              onDelete={handleDeleteBucket}
              onReorder={(reordered) => reorderBucketMutation.mutate(reordered)}
              onAddQuestion={openAddQuestion}
              onEditQuestion={openEditQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onAddChildQuestion={openAddChildQuestion}
              onReorderQuestions={(reordered) => reorderQuestionMutation.mutate(reordered)}
            />
          )}
        </div>
      </div>

      {/* Bucket Modal */}
      <Dialog open={showBucketModal} onOpenChange={setShowBucketModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBucket ? 'Edit Bucket' : 'Add Bucket'}</DialogTitle>
          </DialogHeader>
          <BucketModal
            bucket={editingBucket}
            trialPoints={trialPoints}
            onSubmit={handleSaveBucket}
            onCancel={() => setShowBucketModal(false)}
            isLoading={bucketMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Question Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : parentQuestion ? 'Add Follow-up Question' : 'Add Question'}
            </DialogTitle>
          </DialogHeader>
          {questionBucket && (
            <QuestionModal
              question={editingQuestion}
              parentQuestion={parentQuestion}
              bucketId={questionBucket.id}
              partyId={selectedParty.id}
              examType={selectedExamType}
              onSubmit={(data) => questionMutation.mutate(data)}
              onCancel={() => setShowQuestionModal(false)}
              isLoading={questionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Error */}
      <AlertDialog open={showDeleteError} onOpenChange={setShowDeleteError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Cannot Delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700">
              {deleteError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction>Understood</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}