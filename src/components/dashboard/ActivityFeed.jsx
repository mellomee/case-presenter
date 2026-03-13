import React from 'react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Users, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function ActivityFeed() {
  const { data: logs = [] } = useQuery({
    queryKey: ['activityLogs'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 10).catch(() => []),
  });

  const getIcon = (entityType) => {
    const iconMap = {
      Proof: FileText,
      Party: Users,
      Question: CheckCircle,
      AdmissionBlock: CheckCircle,
    };
    return iconMap[entityType] || Clock;
  };

  const getColor = (action) => {
    if (action.includes('created') || action.includes('added')) return 'text-green-600';
    if (action.includes('updated') || action.includes('modified')) return 'text-blue-600';
    if (action.includes('deleted') || action.includes('removed')) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity</p>
        ) : (
          logs.map((log) => {
            const Icon = getIcon(log.entity_type);
            return (
              <div key={log.id} className="flex gap-3 pb-3 border-b border-slate-200 last:border-0">
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getColor(log.action)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{log.action}</span>
                  </p>
                  <p className="text-xs text-slate-500">{log.entity_type}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {log.created_date && format(new Date(log.created_date), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}