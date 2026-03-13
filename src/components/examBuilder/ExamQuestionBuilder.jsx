import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';

export default function ExamQuestionBuilder({ exam, onBack }) {
  const queryClient = useQueryClient();
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    question_number: 1,
    question_text: '',
    expected_answer: '',
    notes: '',
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['examQuestions', exam.id],
    queryFn: async () => {
      const allQuestions = await base44.entities.ExamQuestion.list();
      return allQuestions.filter((q) => q.exam_id === exam.id).sort((a, b) => a.question_number - b.question_number);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.ExamQuestion.create({
        ...data,
        exam_id: exam.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examQuestions', exam.id] });
      setNewQuestion({
        question_number: (questions.length || 0) + 1,
        question_text: '',
        expected_answer: '',
        notes: '',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExamQuestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examQuestions', exam.id] });
      setEditingQuestionId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExamQuestion.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['examQuestions', exam.id] }),
  });

  const handleAddQuestion = (e) => {
    e.preventDefault();
    createMutation.mutate(newQuestion);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Exams
        </button>

        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">{exam.title}</h2>
          <p className="text-sm text-slate-600">
            {exam.exam_type === 'direct' ? 'Direct Examination' : 'Cross-Examination'}
          </p>
          {exam.description && <p className="text-sm text-slate-700 mt-2">{exam.description}</p>}
        </div>

        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Question</h3>
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question *</label>
              <Textarea
                placeholder="Enter the question to ask the witness"
                value={newQuestion.question_text}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, question_text: e.target.value })
                }
                required
                className="h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expected Answer
              </label>
              <Textarea
                placeholder="What response do you expect or want?"
                value={newQuestion.expected_answer}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, expected_answer: e.target.value })
                }
                className="h-16"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                placeholder="Attorney notes for this question"
                value={newQuestion.notes}
                onChange={(e) => setNewQuestion({ ...newQuestion, notes: e.target.value })}
                className="h-16"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Questions ({questions.length})</h3>
          {questions.length === 0 ? (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-600">No questions added yet.</p>
            </div>
          ) : (
            questions.map((question) => (
              <Card key={question.id} className="p-4">
                <div className="flex gap-4">
                  <div className="flex items-center text-slate-400">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {question.question_number}. {question.question_text}
                    </p>
                    {question.expected_answer && (
                      <p className="text-sm text-slate-600 mt-2">
                        <span className="font-medium">Expected: </span>
                        {question.expected_answer}
                      </p>
                    )}
                    {question.notes && (
                      <p className="text-xs text-slate-500 mt-2">
                        <span className="font-medium">Notes: </span>
                        {question.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(question.id)}
                    className="h-7 w-7 text-slate-600 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}