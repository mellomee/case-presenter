import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

export default function GeneralTab() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    case_name: '',
    jury_demonstrative_label: 'For illustrative purposes only',
    liveblocks_room_id: 'case-presenter-trial',
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result.length > 0 ? result[0] : null;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        case_name: settings.case_name || '',
        jury_demonstrative_label: settings.jury_demonstrative_label || 'For illustrative purposes only',
        liveblocks_room_id: settings.liveblocks_room_id || 'case-presenter-trial',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings && settings.id) {
        return base44.entities.AppSettings.update(settings.id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appSettings'] }),
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">Case Name</label>
        <Input
          value={formData.case_name}
          onChange={(e) => setFormData({ ...formData, case_name: e.target.value })}
          placeholder="e.g., Smith v. Jones"
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">Displayed in navigation sidebar</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Jury Demonstrative Label
        </label>
        <Textarea
          value={formData.jury_demonstrative_label}
          onChange={(e) => setFormData({ ...formData, jury_demonstrative_label: e.target.value })}
          placeholder="Label shown on jury view for demonstrative exhibits"
          rows={2}
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">Shown on jury screen for demonstrative exhibits</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">Liveblocks Room ID</label>
        <Input
          value={formData.liveblocks_room_id}
          onChange={(e) => setFormData({ ...formData, liveblocks_room_id: e.target.value })}
          placeholder="case-presenter-trial"
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">Used for real-time attorney-jury synchronization</p>
      </div>

      <Button onClick={handleSave} className="gap-2" disabled={saveMutation.isPending}>
        <Save className="w-4 h-4" />
        {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}