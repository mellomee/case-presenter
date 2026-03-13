import React from 'react';
import { LayoutDashboard, Users, FileText, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CaseOverview from '@/components/dashboard/CaseOverview';
import StatCard from '@/components/dashboard/StatCard';
import QuickActions from '@/components/dashboard/QuickActions';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import TrialReadiness from '@/components/dashboard/TrialReadiness';

export default function Dashboard() {
  const { data: appSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result.length > 0 ? result[0] : null;
    },
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list().catch(() => []),
  });

  const { data: trials = [] } = useQuery({
    queryKey: ['trials'],
    queryFn: () => base44.entities.Trial.list().catch(() => []),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list().catch(() => []),
  });

  const { data: admissions = [] } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => base44.entities.AdmissionBlock.list().catch(() => []),
  });

  const plaintiffCount = parties.filter((p) => p.side === 'Plaintiff').length;
  const defenseCount = parties.filter((p) => p.side === 'Defense').length;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        </div>

        <CaseOverview caseName={appSettings?.case_name} partyCount={parties.length} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <StatCard
            icon={Users}
            label="Plaintiff/Direct"
            value={plaintiffCount}
            color="green"
          />
          <StatCard icon={Users} label="Defense/Cross" value={defenseCount} color="red" />
          <StatCard icon={FileText} label="Exhibits" value={proofs.length} color="blue" />
          <StatCard icon={BookOpen} label="Questions" value={questions.length} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
          <TrialReadiness
            partiesCount={parties.length}
            proofsCount={proofs.length}
            questionsCount={questions.length}
            admissionsCount={admissions.length}
          />
        </div>

        <div className="mt-6">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}