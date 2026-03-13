import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export default function ExamCard({ exam, onEdit, onDelete }) {
  const { data: party } = useQuery({
    queryKey: ['party', exam.party_id],
    queryFn: () =>
      exam.party_id
        ? base44.entities.Party.list().then((parties) => parties.find((p) => p.id === exam.party_id))
        : null,
    enabled: !!exam.party_id,
  });

  const { data: questionCount = 0 } = useQuery({
    queryKey: ['examQuestions', exam.id],
    queryFn: async () => {
      const questions = await base44.entities.ExamQuestion.list();
      return questions.filter((q) => q.exam_id === exam.id).length;
    },
  });

  const examTypeColor = exam.exam_type === 'direct' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const examTypeLabel = exam.exam_type === 'direct' ? 'Direct' : 'Cross';

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{exam.title}</h3>
          {party && <p className="text-sm text-slate-500 mt-1">Witness: {party.name}</p>}
        </div>
        <Badge className={`${examTypeColor} text-xs`}>{examTypeLabel}</Badge>
      </div>

      {exam.description && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exam.description}</p>}

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <span className="text-xs text-slate-500">{questionCount} questions</span>

        <div className="flex gap-2">
          <Link to={`/ExamBuilder?examId=${exam.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-blue-600 hover:text-blue-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(exam)}
            className="h-7 w-7 text-slate-600 hover:text-blue-600"
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(exam.id)}
            className="h-7 w-7 text-slate-600 hover:text-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}