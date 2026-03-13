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

export default function ExamBuilder() {
  const queryClient = useQueryClient();
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedExamType, setSelectedExamType] = useState('Direct');
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [editingBucket, setEditingBucket] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showDeleteError, setShowDeleteError] = useState(false);

  // Fetch parties
  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  // Fetch buckets for selected party and exam type
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

  // Fetch trial points
  const { data: trialPoints = [] } = useQuery({
    queryKey: ['trialPoints'],
    queryFn: () => base44.entities.TrialPoint.list(),
  });

  // Fetch questions and admission blocks to check dependencies
  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list(),
  });

  const { data: admissionBlocks = [] } = useQuery({
    queryKey: ['admissionBlocks'],
    queryFn: () => base44.entities.AdmissionBlock.list(),
  });

  // Create/Update bucket mutation
  const bucketMutation = useMutation({
    mutationFn: async (data) => {
      if (editingBucket) {
        return base44.entities.Bucket.update(editingBucket.id, data);
      } else {
        return base44.entities.Bucket.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      setShowBucketModal(false);
      setEditingBucket(null);
    },
  });

  // Delete bucket mutation
  const deleteMutation = useMutation({
    mutationFn: async (bucketId) => {
      // Check for attached questions
      const attachedQuestions = questions.filter((q) => q.bucket_id === bucketId);
      // Check for attached admission blocks
      const attachedBlocks = admissionBlocks.filter((ab) => ab.bucket_id === bucketId);

      if (attachedQuestions.length > 0 || attachedBlocks.length > 0) {
        throw new Error(
          `This Bucket contains ${attachedQuestions.length} questions and ${attachedBlocks.length} admission blocks. Delete or move them first.`
        );
      }

      return base44.entities.Bucket.delete(bucketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    onError: (error) => {
      setDeleteError(error.message);
      setShowDeleteError(true);
    },
  });

  // Reorder buckets
  const reorderMutation = useMutation({
    mutationFn: async (bucketsInNewOrder) => {
      return Promise.all(
        bucketsInNewOrder.map((bucket, idx) =>
          base44.entities.Bucket.update(bucket.id, { sort_order: idx })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
  });

  const handleAddBucket = () => {
    setEditingBucket(null);
    setShowBucketModal(true);
  };

  const handleEditBucket = (bucket) => {
    setEditingBucket(bucket);
    setShowBucketModal(true);
  };

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
      deleteMutation.mutate(bucketId);
    }
  };

  const handleReorderBuckets = (reorderedBuckets) => {
    reorderMutation.mutate(reorderedBuckets);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Exam Builder</h1>
            <p className="text-sm text-slate-600 mt-1">
              {selectedParty.first_name} {selectedParty.last_name}
            </p>
          </div>
          <PartySelector parties={parties} selectedParty={selectedParty} onSelect={setSelectedParty} />
        </div>

        {/* Exam Type Toggle */}
        <div className="mb-8">
          <ExamTypeToggle selectedType={selectedExamType} onSelect={setSelectedExamType} />
        </div>

        {/* Buckets Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              {selectedExamType === 'Direct' ? '🟢' : '🔴'} Buckets
            </h2>
            <Button onClick={handleAddBucket} className="gap-2 bg-blue-600 hover:bg-blue-700">
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
              onEdit={handleEditBucket}
              onDelete={handleDeleteBucket}
              onReorder={handleReorderBuckets}
            />
          )}
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

        {/* Delete Error Dialog */}
        <AlertDialog open={showDeleteError} onOpenChange={setShowDeleteError}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Cannot Delete Bucket
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">
                {deleteError}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}