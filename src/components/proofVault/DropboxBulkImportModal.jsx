import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, ChevronLeft, File, Folder, Link2, Loader2, Trash2 } from 'lucide-react';
import PartyMultiSelectField from '@/components/proofVault/PartyMultiSelectField.jsx';
import PdfProcessingOptions from '@/components/proofVault/PdfProcessingOptions.jsx';
import ProcessingCompleteDialog from '@/components/proofVault/ProcessingCompleteDialog.jsx';
import BulkImportProgressBar from '@/components/proofVault/BulkImportProgressBar.jsx';
import { buildProcessDropboxPdfPayload, processDropboxPdf } from '@/lib/dropboxPdfProcessing';

function normalizePath(path) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function getParentPath(path) {
  if (!path || path === '/') return '';
  const segments = path.split('/').filter(Boolean);
  return segments.length <= 1 ? '' : `/${segments.slice(0, -1).join('/')}`;
}

function formatFileSize(size) {
  if (!size) return '—';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getBaseName(fileName) {
  return String(fileName || '').replace(/\.[^/.]+$/, '');
}

function inferFileType(fileName) {
  const extension = (String(fileName || '').split('.').pop() || '').toLowerCase();
  if (['pdf'].includes(extension)) return 'PDF';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff'].includes(extension)) return 'Image';
  if (['mp4', 'mov', 'avi', 'm4v', 'webm', 'mpeg', 'mpg', 'wmv', 'mkv'].includes(extension)) return 'Video';
  return null;
}

function buildInitialSelection(file) {
  return {
    ...file,
    status: 'pending',
    progress: 0,
    error: '',
    createdProof: null,
  };
}

export default function DropboxBulkImportModal({ open, onClose, onImportComplete, onEditImported }) {
  const [currentPath, setCurrentPath] = useState('');
  const [search, setSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [browserSelectedKeys, setBrowserSelectedKeys] = useState([]);
  const [proofCategory, setProofCategory] = useState('Exhibit');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [isProgressBarMinimized, setIsProgressBarMinimized] = useState(false);
  const [importProgress, setImportProgress] = useState({ value: 0, label: '', currentFile: '' });
  const [isImportPaused, setIsImportPaused] = useState(false);

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    enabled: open,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
    enabled: open,
  });

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
    enabled: open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const rootPath = appSettings[0]?.dropbox_browse_folder || appSettings[0]?.dropbox_save_folder || '';
    setCurrentPath(normalizePath(rootPath));
    setSearch('');
    setSelectedFiles([]);
    setBrowserSelectedKeys([]);
    setProofCategory('Exhibit');
    setIsImporting(false);
    setError('');
    setCompleted(false);
    setImportSummary(null);
  }, [open, appSettings]);

  const { data, isLoading } = useQuery({
    queryKey: ['bulkBrowseDropboxFiles', currentPath],
    queryFn: async () => {
      const response = await base44.functions.invoke('browseDropboxFiles', { path: currentPath });
      return response.data;
    },
    enabled: open,
  });

  const filteredEntries = useMemo(() => {
    const entries = data?.entries || [];
    if (!search.trim()) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [data, search]);

  const selectedLookup = useMemo(
    () => new Set(selectedFiles.map((file) => file.id || file.path_display)),
    [selectedFiles]
  );

  const toggleBrowserSelection = (file) => {
    const key = file.id || file.path_display;
    setBrowserSelectedKeys((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  const addSelectedFilesToQueue = () => {
    const selectedEntries = filteredEntries.filter((entry) => entry.type === 'file' && browserSelectedKeys.includes(entry.id || entry.path_display));
    if (selectedEntries.length === 0) return;

    setSelectedFiles((current) => {
      const existingKeys = new Set(current.map((file) => file.id || file.path_display));
      const nextFiles = selectedEntries.filter((file) => !existingKeys.has(file.id || file.path_display));
      return nextFiles.length > 0 ? [...current, ...nextFiles.map(buildInitialSelection)] : current;
    });

    setBrowserSelectedKeys([]);
  };

  const removeFile = (fileKey) => {
    if (isImporting) return;
    setSelectedFiles((current) => current.filter((file) => (file.id || file.path_display) !== fileKey));
  };

  const updateSelectedFile = (fileKey, patch) => {
    setSelectedFiles((current) => current.map((file) => ((file.id || file.path_display) === fileKey ? { ...file, ...patch } : file)));
  };

  const startProgress = (fileKey) => {
    updateSelectedFile(fileKey, { status: 'processing', progress: 12, error: '' });
    const interval = window.setInterval(() => {
      setSelectedFiles((current) => current.map((file) => {
        const currentKey = file.id || file.path_display;
        if (currentKey !== fileKey || file.status !== 'processing') return file;
        const nextProgress = Math.min(file.progress + 14, 86);
        return { ...file, progress: nextProgress };
      }));
    }, 350);
    return interval;
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError('Select at least one Dropbox file.');
      return;
    }

    setError('');
    setIsImporting(true);
    setCompleted(false);
    setShowProgressBar(true);
    setIsProgressBarMinimized(false);
    setImportProgress({ value: 5, label: `Starting ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}...`, currentFile: '' });

    const importedFiles = [];
    const processedFiles = [];
    let folderUrl = '';
    let folderPath = '';
    let failureCount = 0;
    let shouldStop = false;

    for (let idx = 0; idx < selectedFiles.length; idx += 1) {
      if (shouldStop) break;

      // Wait while paused
      while (isImportPaused && !shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const file = selectedFiles[idx];
      const fileKey = file.id || file.path_display;
      const interval = startProgress(fileKey);

      try {
        const fileType = inferFileType(file.name);
        if (!fileType) {
          throw new Error('Unsupported file type.');
        }

        if (proofCategory === 'Deposition' && fileType === 'Image') {
          throw new Error('Depositions cannot use image files.');
        }

        const baseName = getBaseName(file.name);
         const internalName = file.internalName || baseName;
         const filePartyId = file.filePartyId || '';
         const fileProofTypeId = file.fileProofTypeId || '';
         const fileDraftExhibitNum = file.draftExhibitNum || '';

         let payload = {
           proof_category: proofCategory,
           file_type: fileType,
           name: internalName,
           formal_name: baseName,
           description: '',
           status: 'Draft',
           draft_exhibit_num: fileDraftExhibitNum,
           proof_type_category_id: fileProofTypeId,
           category_id: categoryId,
           party_id: filePartyId,
           party_ids: filePartyId ? { ids: [filePartyId] } : null,
           file_source: 'dropbox',
           file_url: '',
           video_url: '',
           dropbox_file_id: file.id,
           dropbox_path: file.path_display,
           dropbox_file_name: file.name,
         };

        if (fileType === 'PDF') {
          const responseData = await processDropboxPdf(buildProcessDropboxPdfPayload({
            file,
            options: {
              addCoverPage: true,
              addPageNumbers: true,
              optimizePdf: true,
            },
            metadata: {
              proofName: baseName,
              formalName: baseName,
              proofCategory,
            },
          }));

          payload = {
            ...payload,
            ...responseData,
            name: internalName,
            formal_name: baseName,
            proof_type_category_id: fileProofTypeId,
            category_id: null,
            party_id: filePartyId,
            party_ids: filePartyId ? { ids: [filePartyId] } : null,
            status: 'Draft',
            draft_exhibit_num: fileDraftExhibitNum,
          };

          processedFiles.push(responseData.processed_file_name || responseData.dropbox_file_name || file.name);
          folderUrl = folderUrl || responseData.dropbox_folder_url || '';
          folderPath = folderPath || responseData.dropbox_folder_path || '';
        }

        const createdProof = await base44.entities.Proof.create(payload);
        importedFiles.push(file.name);
        window.clearInterval(interval);
        updateSelectedFile(fileKey, {
          status: 'done',
          progress: 100,
          createdProof,
          error: '',
        });
      } catch (importError) {
        failureCount += 1;
        window.clearInterval(interval);
        updateSelectedFile(fileKey, {
          status: 'error',
          progress: 100,
          error: importError.message || 'Import failed.',
        });
      }
    }

    setIsImporting(false);
    setCompleted(true);
    onImportComplete?.();

    if (importedFiles.length > 0) {
      setImportSummary({
        title: 'Dropbox import complete',
        message: processDropboxPdfEnabled && processedFiles.length > 0
          ? `Imported ${importedFiles.length} proof${importedFiles.length === 1 ? '' : 's'} and saved ${processedFiles.length} processed PDF cop${processedFiles.length === 1 ? 'y' : 'ies'} to your Dropbox save folder.${failureCount > 0 ? ` ${failureCount} failed.` : ''}`
          : `Imported ${importedFiles.length} proof${importedFiles.length === 1 ? '' : 's'} from Dropbox.${failureCount > 0 ? ` ${failureCount} failed.` : ''}`,
        fileNames: processedFiles.length > 0 ? processedFiles : importedFiles,
        folderUrl,
        folderPath,
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    setBrowserSelectedKeys([]);
  }, [currentPath, open]);

  const successCount = selectedFiles.filter((file) => file.status === 'done').length;
  const browserSelectableCount = browserSelectedKeys.filter((key) => !selectedLookup.has(key)).length;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk link Dropbox files</DialogTitle>
          <DialogDescription>Files stay in Dropbox — the app stores Dropbox references and uses the filename to prefill the proof names.</DialogDescription>
        </DialogHeader>

        <ProcessingCompleteDialog
          open={Boolean(importSummary)}
          onOpenChange={(open) => !open && setImportSummary(null)}
          title={importSummary?.title}
          message={importSummary?.message}
          fileNames={importSummary?.fileNames || []}
          folderUrl={importSummary?.folderUrl}
          folderPath={importSummary?.folderPath}
        />

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-600">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPath(getParentPath(currentPath))} disabled={!currentPath} className="gap-1">
                    <ChevronLeft className="w-4 h-4" /> Up
                  </Button>
                  <span className="min-w-0 truncate font-mono text-xs">{currentPath || '/'}</span>
                </div>
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter Dropbox files" className="w-full sm:w-72 sm:flex-none" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Select the files you want, then add them all at once.</p>
                <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={addSelectedFilesToQueue} disabled={browserSelectableCount === 0 || isImporting}>
                  Add selected{browserSelectableCount > 0 ? ` (${browserSelectableCount})` : ''}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 max-h-[22rem] overflow-y-auto overflow-x-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading Dropbox files...
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No matching files found.</div>
              ) : (
                filteredEntries.map((entry) => {
                  const fileKey = entry.id || entry.path_display;
                  const selected = selectedLookup.has(fileKey);
                  const checked = browserSelectedKeys.includes(fileKey);
                  return (
                    <div key={fileKey} className="flex flex-col items-start gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 sm:flex-row sm:items-center">
                      {entry.type === 'file' && (
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={selected || isImporting}
                          onChange={() => toggleBrowserSelection(entry)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 sm:mt-0"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (entry.type === 'folder') setCurrentPath(entry.path_display || '');
                          if (entry.type === 'file' && !selected && !isImporting) toggleBrowserSelection(entry);
                        }}
                        className="flex items-center gap-3 min-w-0 text-left flex-1"
                      >
                        {entry.type === 'folder' ? <Folder className="w-4 h-4 text-amber-500 shrink-0" /> : <File className="w-4 h-4 text-slate-400 shrink-0" />}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-800">{entry.name}</div>
                          <div className="truncate text-xs text-slate-500">{entry.path_display}</div>
                        </div>
                      </button>

                      {entry.type === 'file' && (
                        <div className="self-end shrink-0 sm:self-auto">
                          {selected ? (
                            <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                              Added
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-500">{checked ? 'Selected' : 'Select'}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-semibold text-slate-900">Selected Dropbox files</p>
                <p className="text-xs text-slate-500">{selectedFiles.length} selected</p>
              </div>

              {selectedFiles.length === 0 ? (
                <p className="text-sm text-slate-500">Add Dropbox files from the browser above.</p>
              ) : (
                <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                  {selectedFiles.map((file) => {
                    const fileKey = file.id || file.path_display;
                    const baseName = getBaseName(file.name);
                    return (
                      <div key={fileKey} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500 truncate">{file.path_display}</p>
                            <p className="text-xs text-slate-400 mt-1">{formatFileSize(file.size)}</p>
                          </div>
                          {!isImporting && !completed && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => removeFile(fileKey)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {!(isImporting || completed) && (
                          <div className="space-y-2 border-t pt-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Internal Name</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={file.internalName || baseName}
                                  onChange={(e) => updateSelectedFile(fileKey, { internalName: e.target.value })}
                                  placeholder={baseName}
                                  className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400"
                                  disabled={isImporting}
                                />
                                {file.internalName && (
                                  <button
                                    type="button"
                                    onClick={() => updateSelectedFile(fileKey, { internalName: '' })}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Party</label>
                              <select
                                value={file.filePartyId || ''}
                                onChange={(e) => updateSelectedFile(fileKey, { filePartyId: e.target.value })}
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 bg-white"
                                disabled={isImporting}
                              >
                                <option value="">{partyIds.length > 0 ? 'Use default' : 'Not assigned'}</option>
                                {parties.map((party) => (
                                  <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Proof Type</label>
                              <select
                                value={file.fileProofTypeId || ''}
                                onChange={(e) => updateSelectedFile(fileKey, { fileProofTypeId: e.target.value })}
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 bg-white"
                                disabled={isImporting}
                              >
                                <option value="">{proofTypeCategoryId ? 'Use default' : 'Select type'}</option>
                                {proofTypes.map((type) => (
                                  <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Draft Exhibit #</label>
                              <input
                                type="text"
                                value={file.draftExhibitNum || ''}
                                onChange={(e) => updateSelectedFile(fileKey, { draftExhibitNum: e.target.value })}
                                placeholder="e.g., A-1"
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400"
                                disabled={isImporting}
                              />
                            </div>
                          </div>
                        )}

                        {(isImporting || completed) && (
                          <div className="space-y-2">
                            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full transition-all ${file.status === 'error' ? 'bg-red-500' : file.status === 'done' ? 'bg-green-500' : 'bg-blue-600'}`}
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className={file.status === 'error' ? 'text-red-600' : file.status === 'done' ? 'text-green-600' : 'text-slate-500'}>
                                {file.status === 'pending' ? 'Waiting…' : file.status === 'processing' ? 'Linking Dropbox file…' : file.status === 'done' ? 'Imported' : file.error || 'Import failed'}
                              </span>
                              {file.createdProof && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onEditImported?.(file.createdProof);
                                    onClose?.();
                                  }}
                                  className="font-medium text-blue-600 hover:text-blue-700"
                                >
                                  Edit details
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proof Category *</label>
                <select value={proofCategory} onChange={(event) => setProofCategory(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="Exhibit">Exhibit</option>
                  <option value="Deposition">Deposition</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
              <p><strong>What the app fills automatically:</strong> Internal Name, Formal Name, Dropbox file ID, Dropbox path, Dropbox filename, and inferred file type.</p>
              <p><strong>How files are stored:</strong> The app keeps a Dropbox reference instead of uploading the file into the app.</p>
              <p><strong>If PDF processing is enabled:</strong> The app saves a new processed Dropbox copy in your save folder and points the proof to that new file.</p>
              <p><strong>After import:</strong> Use the Edit details button beside any imported proof to open the normal proof form with the extracted data prefilled.</p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {completed && successCount > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700">Imported {successCount} proof{successCount === 1 ? '' : 's'} from Dropbox.</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isImporting}>Close</Button>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleImport} disabled={isImporting || selectedFiles.length === 0}>
                {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Link2 className="w-4 h-4" /> Import Dropbox Files</>}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}