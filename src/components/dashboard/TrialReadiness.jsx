import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function TrialReadiness({
  partiesCount,
  proofsCount,
  questionsCount,
  admissionsCount,
}) {
  // Calculate readiness percentage based on key items
  const criteria = [
    { label: 'Parties', value: partiesCount, required: 1, weight: 20 },
    { label: 'Proofs/Exhibits', value: proofsCount, required: 1, weight: 30 },
    { label: 'Questions', value: questionsCount, required: 5, weight: 30 },
    { label: 'Admissions', value: admissionsCount, required: 1, weight: 20 },
  ];

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const readinessScore = criteria.reduce((sum, c) => {
    const progress = Math.min(c.value / c.required, 1);
    return sum + (progress * c.weight) / totalWeight;
  }, 0);

  const readinessPercent = Math.round(readinessScore * 100);
  const isReady = readinessPercent >= 75;

  const getStatusColor = (value, required) => {
    if (value === 0) return 'text-red-600';
    if (value >= required) return 'text-green-600';
    return 'text-yellow-600';
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Trial Readiness</h3>
        <Badge variant={isReady ? 'default' : 'secondary'} className="flex items-center gap-1">
          {isReady ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {readinessPercent}%
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              isReady ? 'bg-green-500' : readinessPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${readinessPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {isReady ? 'Ready for trial' : 'Incomplete preparation'}
        </p>
      </div>

      {/* Criteria checklist */}
      <div className="space-y-3">
        {criteria.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(item.value, item.required)}`} />
              <span className="text-sm text-slate-700">{item.label}</span>
            </div>
            <span className={`text-sm font-medium ${getStatusColor(item.value, item.required)}`}>
              {item.value} / {item.required}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}