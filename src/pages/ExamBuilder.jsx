import React, { useState, useEffect } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import ExamForm from '@/components/examBuilder/ExamForm';
import ExamCard from '@/components/examBuilder/ExamCard';
import ExamQuestionBuilder from '@/components/examBuilder/ExamQuestionBuilder';

export default function ExamBuilder() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(searchParams.get('examId') || null);
  const [filterType, setFilterType] = useState('all');

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => base44.entities.Exam.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Exam.create(data),
    onSuccess: (newExam) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setShowForm(false);
      setSelectedExamId(newExam.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Exam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setEditingExam(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Exam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setSelectedExamId(null);
    },
  });

  const handleSubmit = (formData) => {
    if (editingExam) {
      updateMutation.mutate({ id: editingExam.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingExam(null);
    setShowForm(false);
  };

  const filteredExams =
    filterType === 'all' ? exams : exams.filter((e) => e.exam_type === filterType);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  if (selectedExamId && selectedExam) {
    return <ExamQuestionBuilder exam={selectedExam} onBack={() => setSelectedExamId(null)} />;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Exam Builder</h2>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Create Exam
          </Button>
        </div>

        {showForm && (
          <ExamForm exam={editingExam} onSubmit={handleSubmit} onCancel={handleCancel} />
        )}

        <div className="mb-6 flex gap-2">
          {['all', 'direct', 'cross'].map((type) => {
            const count =
              type === 'all' ? exams.length : exams.filter((e) => e.exam_type === type).length;
            return (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className={filterType === type ? 'bg-blue-600' : ''}
              >
                {type === 'all' ? 'All' : type === 'direct' ? 'Direct' : 'Cross'} ({count})
              </Button>
            );
          })}
        </div>

        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">No examinations created yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onEdit={handleEdit}
                onDelete={deleteMutation.mutate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}