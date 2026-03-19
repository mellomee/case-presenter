import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DropboxTab() {
  const [dropboxSaveFolder, setDropboxSaveFolder] = useState('/Case Presenter/OCR');
  const [dropboxExtractFolder, setDropboxExtractFolder] = useState('/Case Presenter/Extracts');
  const [dropboxBrowseFolder, setDropboxBrowseFolder] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    if (!settings.length) return;
    setDropboxSaveFolder(settings[0].dropbox_save_folder || '/Case Presenter/OCR');
    setDropboxExtractFolder(settings[0].dropbox_extract_folder || '/Case Presenter/Extracts');
    setDropboxBrowseFolder(settings[0].dropbox_browse_folder || '');
    setHasChanges(false);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dropbox_save_folder: dropboxSaveFolder.trim() || '/Case Presenter/OCR',
        dropbox_extract_folder: dropboxExtractFolder.trim() || '/Case Presenter/Extracts',
        dropbox_browse_folder: dropboxBrowseFolder.trim(),
      };
      if (settings.length > 0) {
        return base44.entities.AppSettings.update(settings[0].id, payload);
      }
      return base44.entities.AppSettings.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      setHasChanges(false);
    },
  });

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Dropbox</h3>
        {hasChanges && (
          <Button onClick={() => saveMutation.mutate()} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-6 bg-white p-6 rounded-lg border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Dropbox Source Folder</label>
          <Input
            value={dropboxSaveFolder}
            onChange={(e) => {
              setDropboxSaveFolder(e.target.value);
              setHasChanges(true);
            }}
            placeholder="/Case Presenter/OCR"
          />
          <p className="text-xs text-slate-500 mt-1">
            Optimized parent proofs (source PDFs) are saved here. Used when viewing original PDFs.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Dropbox Extract Folder</label>
          <Input
            value={dropboxExtractFolder}
            onChange={(e) => {
              setDropboxExtractFolder(e.target.value);
              setHasChanges(true);
            }}
            placeholder="/Case Presenter/Extracts"
          />
          <p className="text-xs text-slate-500 mt-1">
            Extract PDFs and extract clips are saved here. Used when viewing extracts and clips.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Default Dropbox Browse Folder</label>
          <Input
            value={dropboxBrowseFolder}
            onChange={(e) => {
              setDropboxBrowseFolder(e.target.value);
              setHasChanges(true);
            }}
            placeholder="/PracticePanther/Lisa Chan"
          />
          <p className="text-xs text-slate-500 mt-1">
            Add Proof → Dropbox link opens here by default. Leave blank to keep using the source folder.
          </p>
        </div>
      </div>
    </div>
  );
}