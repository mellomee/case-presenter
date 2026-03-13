import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExamScript({ exam }) {
  const { data: questions = [] } = useQuery({
    queryKey: ['examQuestions', exam.id],
    queryFn: async () => {
      const allQuestions = await base44.entities.ExamQuestion.list();
      return allQuestions
        .filter((q) => q.exam_id === exam.id)
        .sort((a, b) => a.question_number - b.question_number);
    },
  });

  const { data: party } = useQuery({
    queryKey: ['party', exam.party_id],
    queryFn: () => base44.entities.Party.get(exam.party_id),
    enabled: !!exam.party_id,
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-700/50">
        <h2 className="text-xl font-bold text-white mb-2">{exam.title}</h2>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-slate-400">Witness: </span>
            <span className="text-white font-medium">{party?.name || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-slate-400">Type: </span>
            <span className="text-white font-medium capitalize">
              {exam.exam_type === 'direct' ? 'Direct Examination' : 'Cross-Examination'}
            </span>
          </div>
        </div>
        {exam.description && (
          <p className="text-sm text-slate-300 mt-3">{exam.description}</p>
        )}
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {questions.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <p>No questions added to this examination yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors">
                {/* Question */}
                <div className="flex gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{question.question_number}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium leading-relaxed">{question.question_text}</p>
                  </div>
                </div>

                {/* Expected Answer */}
                {question.expected_answer && (
                  <div className="ml-11 mb-3 p-3 bg-slate-800/50 rounded border-l-2 border-green-500">
                    <p className="text-xs font-semibold text-green-400 mb-1">Expected Answer:</p>
                    <p className="text-sm text-slate-200">{question.expected_answer}</p>
                  </div>
                )}

                {/* Notes */}
                {question.notes && (
                  <div className="ml-11 p-3 bg-slate-600/30 rounded border-l-2 border-amber-500">
                    <p className="text-xs font-semibold text-amber-400 mb-1">Notes:</p>
                    <p className="text-sm text-slate-300">{question.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Attorney Notes */}
      {exam.notes && (
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-700/30">
          <p className="text-xs font-semibold text-slate-400 mb-2">EXAMINATION NOTES:</p>
          <p className="text-sm text-slate-200">{exam.notes}</p>
        </div>
      )}
    </div>
  );
}