import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function GeneralTab() {
  const [formData, setFormData] = useState({
    case_name: '',
    jury_demonstrative_label: 'For illustrative purposes only',
    liveblocks_room_id: 'case-presenter-trial',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    if (settings && Array.isArray(settings) && settings.length > 0) {
      const appSettings = settings[0];
      setFormData({
        case_name: appSettings.case_name || '',
        jury_demonstrative_label: appSettings.jury_demonstrative_label || 'For illustrative purposes only',
        liveblocks_room_id: appSettings.liveblocks_room_id || 'case-presenter-trial',
      });
      setHasChanges(false);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.length > 0) {
        return base44.entities.AppSettings.update(settings[0].id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      setHasChanges(false);
    },
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900">General Settings</h3>
        {hasChanges && (
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-6 bg-white p-6 rounded-lg border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Case Name</label>
          <Input
            value={formData.case_name}
            onChange={(e) => handleChange('case_name', e.target.value)}
            placeholder="e.g. Smith v. Jones"
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">Displayed in sidebar navigation</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Jury Demonstrative Label</label>
          <Textarea
            value={formData.jury_demonstrative_label}
            onChange={(e) => handleChange('jury_demonstrative_label', e.target.value)}
            placeholder="Label shown on jury view for demonstrative exhibits"
            className="w-full min-h-20"
          />
          <p className="text-xs text-slate-500 mt-1">Shown on Jury View for demonstrative exhibits (top-right corner)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Liveblocks Room ID</label>
          <Input
            value={formData.liveblocks_room_id}
            onChange={(e) => handleChange('liveblocks_room_id', e.target.value)}
            placeholder="case-presenter-trial"
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">Used for real-time Attorney→Jury synchronization. Change only if connecting to a different room.</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-semibold text-sm text-slate-900 mb-2">Theme</h4>
          <p className="text-sm text-slate-600">Light theme only (professional, low eye strain)</p>
        </div>
      </div>
    </div>
  );
}