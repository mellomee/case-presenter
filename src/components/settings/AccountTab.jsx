import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LogOut, Mail, Shield, User } from 'lucide-react';

export default function AccountTab() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Account</h3>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading account details...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <User className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Full name</p>
                <p className="text-sm text-slate-900">{me?.full_name || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Mail className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Email</p>
                <p className="text-sm text-slate-900">{me?.email || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Shield className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Role</p>
                <p className="text-sm text-slate-900">{me?.role || 'user'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h4 className="text-sm font-semibold text-slate-900">Session</h4>
        <p className="mt-1 text-sm text-slate-600">Sign out of this account on this device.</p>
        <div className="mt-4">
          <Button variant="destructive" onClick={handleLogout} className="min-h-[44px]">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}