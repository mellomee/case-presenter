import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, KeyRound, Cloud } from 'lucide-react';

export default function ApiManagementTab() {
  const queryClient = useQueryClient();
  const [dropboxRootPath, setDropboxRootPath] = useState('');
  const [message, setMessage] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['apiManagementSettings'],
    queryFn: () => base44.entities.AppSettings.list().then((rows) => rows[0] || null),
  });

  useEffect(() => {
    setDropboxRootPath(settings?.dropbox_root_path || '');
  }, [settings?.id, settings?.dropbox_root_path]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextValue = dropboxRootPath.trim().replace(/^\/+|\/+$/g, '');
      if (settings?.id) {
        return base44.entities.AppSettings.update(settings.id, { dropbox_root_path: nextValue || null });
      }
      return base44.entities.AppSettings.create({ dropbox_root_path: nextValue || null });
    },
    onSuccess: () => {
      setMessage('Dropbox path saved.');
      queryClient.invalidateQueries({ queryKey: ['apiManagementSettings'] });
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
    onError: (error) => {
      setMessage(error.message || 'Unable to save Dropbox path.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3 mb-3">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Adobe PDF Services</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Adobe extraction and OCR use the app credentials already configured for this app.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Cloud className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Dropbox Storage</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Extracted PDFs will still work in the app, and a copy will also be uploaded to Dropbox when a folder path is set here.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Dropbox root folder</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FolderOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={dropboxRootPath}
                onChange={(event) => setDropboxRootPath(event.target.value)}
                placeholder="e.g. Case Presenter/Extracts"
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Path'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Use a folder path only. The app will create files inside it automatically.
          </p>
        </div>

        {message && (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}