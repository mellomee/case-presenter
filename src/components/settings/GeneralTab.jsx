import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function GeneralTab() {
  const [formData, setFormData] = useState({
    case_name: '',
    jury_demonstrative_label: 'For illustrative purposes only',
    liveblocks_room_id: 'case-presenter-trial',
  });

  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const results = await base44.entities.AppSettings.list();
      return results.length > 0 ? results[0] : null;
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

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.AppSettings.update(settings.id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="case_name" className="text-slate-700 font-medium">Case Name</Label>
            <Input
              id="case_name"
              value={formData.case_name}
              onChange={(e) => setFormData({ ...formData, case_name: e.target.value })}
              placeholder="Enter case name"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="jury_label" className="text-slate-700 font-medium">Jury Demonstrative Label</Label>
            <Input
              id="jury_label"
              value={formData.jury_demonstrative_label}
              onChange={(e) => setFormData({ ...formData, jury_demonstrative_label: e.target.value })}
              placeholder="Label for demonstrative exhibits"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="liveblocks" className="text-slate-700 font-medium">Liveblocks Room ID</Label>
            <Input
              id="liveblocks"
              value={formData.liveblocks_room_id}
              onChange={(e) => setFormData({ ...formData, liveblocks_room_id: e.target.value })}
              placeholder="Room ID for real-time sync"
              className="mt-2"
            />
          </div>

          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Save Settings
          </Button>
        </form>
      </Card>
    </div>
  );
}