import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileText, Users, BookOpen, Tv } from 'lucide-react';

export default function QuickActions() {
  const actions = [
    { label: 'Manage Proof', icon: FileText, path: '/ProofVault', color: 'text-blue-600' },
    { label: 'Add Party', icon: Users, path: '/Parties', color: 'text-green-600' },
    { label: 'Build Exam', icon: BookOpen, path: '/ExamBuilder', color: 'text-purple-600' },
    { label: 'Present Trial', icon: Tv, path: '/AttorneyView', color: 'text-red-600' },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.path} to={action.path}>
              <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                <Icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-xs font-medium text-slate-700 text-center">{action.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}