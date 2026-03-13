import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  return (
    <Card className={`p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <Icon className="w-8 h-8 opacity-50" />
      </div>
    </Card>
  );
}