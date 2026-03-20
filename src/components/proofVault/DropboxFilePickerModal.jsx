import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, File, ChevronLeft, Link2, Loader2 } from 'lucide-react';

function normalizePath(path) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function getParentPath(path) {
  if (!path || path === '/') return '';
  const segments = path.split('/').filter(Boolean);
  return segments.length <= 1 ? '' : `/${segments.slice(0, -1).join('/')}`;
}

export default function DropboxFilePickerModal({ open, onClose, fileType, onSelect }) {
  const [currentPath, setCurrentPath] = useState(null);
  const [search, setSearch] = useState('');

  const { data: appSettings = [], isFetched: isAppSettingsFetched } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open || !isAppSettingsFetched) return;
    const rootPath = normalizePath(appSettings[0]?.dropbox_browse_folder || appSettings[0]?.dropbox_save_folder || '');
    setCurrentPath(rootPath);
    setSearch('');
  }, [open, appSettings, isAppSettingsFetched]);

  const { data, isLoading } = useQuery({
    queryKey: ['browseDropboxFiles', currentPath, fileType],
    queryFn: async () => {
      const response = await base44.functions.invoke('browseDropboxFiles', {
        path: currentPath,
        fileType,
      });
      return response.data;
    },
    enabled: open && currentPath !== null,
  });

  const filteredEntries = useMemo(() => {
    const entries = data?.entries || [];
    if (!search.trim()) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [data, search]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[min(96vw,64rem)] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Dropbox {fileType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-600">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPath(getParentPath(currentPath))}
                disabled={!currentPath}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Up
              </Button>
              <span className="min-w-0 truncate font-mono text-xs">{currentPath || '/'}</span>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files"
              className="w-full sm:w-72 sm:flex-none"
            />
          </div>

          <div className="rounded-lg border border-slate-200 max-h-[28rem] overflow-y-auto overflow-x-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading Dropbox files...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No matching files found.</div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id || entry.path_display}
                  className="flex flex-col items-start gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (entry.type === 'folder') {
                        setCurrentPath(entry.path_display || '');
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 text-left flex-1"
                  >
                    {entry.type === 'folder' ? (
                      <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <File className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{entry.name}</div>
                      <div className="truncate text-xs text-slate-500">{entry.path_display}</div>
                    </div>
                  </button>

                  {entry.type === 'file' && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 gap-2 self-end shrink-0 sm:self-auto"
                      onClick={() => {
                        onSelect?.(entry);
                        onClose?.();
                      }}
                    >
                      <Link2 className="w-4 h-4" /> Select
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}