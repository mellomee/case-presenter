import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ReactPlayer from 'react-player';
import VideoClipWorkspaceSidebar from './VideoClipWorkspaceSidebar.jsx';
import PartyMultiSelectField from '@/components/proofVault/PartyMultiSelectField.jsx';

const VIDEO_CLIP_MODAL_SIZE_KEY = 'proofVault.videoClipModalSize';
const DEFAULT_VIDEO_CLIP_MODAL_SIZE = { width: 1280, height: 820 };
const MIN_VIDEO_CLIP_MODAL_SIZE = { width: 960, height: 620 };

function getInitialVideoClipModalSize() {
  if (typeof window === 'undefined') return DEFAULT_VIDEO_CLIP_MODAL_SIZE;
  try {
    const saved = JSON.parse(window.localStorage.getItem(VIDEO_CLIP_MODAL_SIZE_KEY) || 'null');
    if (!saved) return DEFAULT_VIDEO_CLIP_MODAL_SIZE;
    return {
      width: Math.max(MIN_VIDEO_CLIP_MODAL_SIZE.width, Number(saved.width) || DEFAULT_VIDEO_CLIP_MODAL_SIZE.width),
      height: Math.max(MIN_VIDEO_CLIP_MODAL_SIZE.height, Number(saved.height) || DEFAULT_VIDEO_CLIP_MODAL_SIZE.height),
    };
  } catch {
    return DEFAULT_VIDEO_CLIP_MODAL_SIZE;
  }
}

function normalizePartyIds(currentProof) {
  const raw = currentProof?.party_ids;
  if (raw && !Array.isArray(raw) && Array.isArray(raw.ids)) {
    return raw.ids.filter(Boolean);
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter(Boolean);
  }
  return currentProof?.party_id ? [currentProof.party_id] : [];
}

export default function CreateVideoClipModal({ open, onClose, parentProof, onSuccess }) {
  const queryClient = useQueryClient();
  const playerRef = useRef(null);
  const resizeRef = useRef(null);
  const isEditing = parentProof?.proof_child_type === 'VideoClip';
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [internalName, setInternalName] = useState('');
  const [formalName, setFormalName] = useState('');
  const [exhibitNum, setExhibitNum] = useState('');
  const [description, setDescription] = useState('');
  const [segments, setSegments] = useState([]);
  const [segmentLabel, setSegmentLabel] = useState('');
  const [tempStartTime, setTempStartTime] = useState('00:00:00');
  const [tempEndTime, setTempEndTime] = useState('00:00:00');
  const [tempPauseAfter, setTempPauseAfter] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [selectedPartyIds, setSelectedPartyIds] = useState([]);
  const [modalSize, setModalSize] = useState(getInitialVideoClipModalSize);

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  useEffect(() => {
    window.localStorage.setItem(VIDEO_CLIP_MODAL_SIZE_KEY, JSON.stringify(modalSize));
  }, [modalSize]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!resizeRef.current) return;
      const width = Math.min(
        Math.floor(window.innerWidth * 0.95),
        Math.max(MIN_VIDEO_CLIP_MODAL_SIZE.width, resizeRef.current.startWidth + (event.clientX - resizeRef.current.startX))
      );
      const height = Math.min(
        Math.floor(window.innerHeight * 0.95),
        Math.max(MIN_VIDEO_CLIP_MODAL_SIZE.height, resizeRef.current.startHeight + (event.clientY - resizeRef.current.startY))
      );
      setModalSize({ width, height });
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        return base44.entities.Proof.update(parentProof.id, data);
      }
      return base44.entities.Proof.create(data);
    },
    onSuccess: (savedProof) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      onSuccess?.(savedProof);
      resetForm();
      onClose();
    },
    onError: (error) => {
      setWarningMsg(`Error ${isEditing ? 'saving' : 'creating'} video clip: ${error.message}`);
      setShowWarning(true);
    },
  });

  const resetForm = () => {
    setInternalName('');
    setFormalName('');
    setExhibitNum('');
    setDescription('');
    setSegments([]);
    setSegmentLabel('');
    setTempStartTime('00:00:00');
    setTempEndTime('00:00:00');
    setTempPauseAfter(false);
    setCurrentTime(0);
    setWarningMsg('');
    setShowWarning(false);
    setWorkspaceCollapsed(false);
    setSelectedPartyIds([]);
  };

  useEffect(() => {
    if (!open || !parentProof) return;

    if (isEditing) {
      setInternalName(parentProof.name || '');
      setFormalName(parentProof.formal_name || '');
      setExhibitNum(parentProof.draft_exhibit_num || '');
      setDescription(parentProof.description || '');
      setSegments(
        (Array.isArray(parentProof.video_clips) ? parentProof.video_clips : []).map((segment, idx) => ({
          ...segment,
          id: segment.id || `seg-${idx}-${Date.now()}`,
          pause_after: Boolean(segment.pause_after),
        }))
      );
      setSegmentLabel('');
      setTempStartTime('00:00:00');
      setTempEndTime('00:00:00');
      setTempPauseAfter(false);
      setCurrentTime(0);
      setWarningMsg('');
      setShowWarning(false);
      setSelectedPartyIds(normalizePartyIds(parentProof));
      return;
    }

    resetForm();
    setSelectedPartyIds(normalizePartyIds(parentProof));
  }, [open, parentProof, isEditing]);

  const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };

  const handleMarkStart = () => {
    setTempStartTime(secondsToTime(currentTime));
  };

  const handleMarkEnd = () => {
    setTempEndTime(secondsToTime(currentTime));
  };

  const handleAddSegment = () => {
    const startSec = timeToSeconds(tempStartTime);
    const endSec = timeToSeconds(tempEndTime);

    if (startSec >= endSec) {
      setWarningMsg('Start time must be before end time');
      setShowWarning(true);
      return;
    }

    const newSegment = {
      id: `seg-${Date.now()}`,
      start: tempStartTime,
      end: tempEndTime,
      label: segmentLabel.trim() || '',
      pause_after: tempPauseAfter,
    };

    setSegments([...segments, newSegment]);
    setSegmentLabel('');
    setTempPauseAfter(false);
  };

  const handleDeleteSegment = (id) => {
    setSegments(segments.filter((s) => s.id !== id));
  };

  const handleToggleSegmentPause = (id) => {
    setSegments((currentSegments) => currentSegments.map((segment) => (
      segment.id === id ? { ...segment, pause_after: !segment.pause_after } : segment
    )));
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;
    
    const newSegments = Array.from(segments);
    const [movedSegment] = newSegments.splice(source.index, 1);
    newSegments.splice(destination.index, 0, movedSegment);
    setSegments(newSegments);
  };

  const handleSubmit = () => {
    if (!internalName.trim()) {
      setWarningMsg('Internal Name is required');
      setShowWarning(true);
      return;
    }
    if (segments.length === 0) {
      setWarningMsg('Add at least one segment');
      setShowWarning(true);
      return;
    }
    if (selectedPartyIds.length === 0) {
      setWarningMsg('Select at least one party');
      setShowWarning(true);
      return;
    }

    const clipData = {
      proof_category: parentProof.proof_category,
      file_type: 'Video',
      proof_child_type: 'VideoClip',
      name: internalName.trim(),
      formal_name: formalName.trim(),
      parent_proof_id: isEditing ? parentProof.parent_proof_id : parentProof.id,
      party_id: selectedPartyIds[0] || null,
      party_ids: { ids: selectedPartyIds },
      status: parentProof.status === 'Draft' ? 'Draft' : parentProof.status,
      category_id: parentProof.category_id || null,
      proof_type_category_id: parentProof.proof_type_category_id,
      video_url: parentProof.video_url || parentProof.file_url,
      file_url: parentProof.file_url || null,
      draft_exhibit_num: exhibitNum.trim() || null,
      description: description.trim() || null,
      video_clips: segments.map(({ id, ...segment }) => ({
        ...segment,
        pause_after: Boolean(segment.pause_after),
      })),
    };

    saveMutation.mutate(clipData);
  };

  const handleResizeMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: modalSize.width,
      startHeight: modalSize.height,
    };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  };

  if (!parentProof) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none overflow-hidden p-0"
        style={{
          width: `${Math.min(modalSize.width, Math.floor(window.innerWidth * 0.95))}px`,
          height: `${Math.min(modalSize.height, Math.floor(window.innerHeight * 0.95))}px`,
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{isEditing ? 'Edit Video Clip' : '🎬 New Video Clip'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 min-h-0 flex-col gap-6 px-6 pb-6 pt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {isEditing ? `Editing: ${parentProof.formal_name || parentProof.name}` : `From: ${parentProof.formal_name}`}
                </p>
                <p className="text-xs text-blue-700 mt-1">Video</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shrink-0">
              <PartyMultiSelectField
                label="Assign to Parties"
                required
                parties={parties}
                value={selectedPartyIds}
                onChange={setSelectedPartyIds}
                helperText="Choose one or more parties for this video clip."
              />
            </div>

            <div className="flex-1 min-h-[20rem] rounded-lg border border-slate-200 overflow-hidden bg-white">
              <div className="flex h-full min-h-0 overflow-hidden">
                <VideoClipWorkspaceSidebar
                  isCollapsed={workspaceCollapsed}
                  onToggleCollapsed={() => setWorkspaceCollapsed((value) => !value)}
                  internalName={internalName}
                  onInternalNameChange={setInternalName}
                  formalName={formalName}
                  onFormalNameChange={setFormalName}
                  exhibitNum={exhibitNum}
                  onExhibitNumChange={setExhibitNum}
                  description={description}
                  onDescriptionChange={setDescription}
                  tempStartTime={tempStartTime}
                  onTempStartTimeChange={setTempStartTime}
                  tempEndTime={tempEndTime}
                  onTempEndTimeChange={setTempEndTime}
                  tempPauseAfter={tempPauseAfter}
                  onTempPauseAfterChange={setTempPauseAfter}
                  segmentLabel={segmentLabel}
                  onSegmentLabelChange={setSegmentLabel}
                  onMarkStart={handleMarkStart}
                  onMarkEnd={handleMarkEnd}
                  onAddSegment={handleAddSegment}
                  currentTimeLabel={secondsToTime(currentTime)}
                  durationLabel={secondsToTime(duration)}
                  segments={segments}
                  onDeleteSegment={handleDeleteSegment}
                  onToggleSegmentPause={handleToggleSegmentPause}
                  onDragEnd={handleDragEnd}
                />

                <div className="flex-1 min-w-0 min-h-0 bg-slate-900">
                  <div className="h-full overflow-hidden">
                    <ReactPlayer
                      ref={playerRef}
                      url={parentProof.video_url || parentProof.file_url}
                      width="100%"
                      height="100%"
                      controls
                      playing={false}
                      onDuration={setDuration}
                      onProgress={(state) => setCurrentTime(state.playedSeconds)}
                      config={{
                        youtube: { playerVars: { showinfo: 1, modestbranding: 1, cc_load_policy: 1 } },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-200 pt-4 shrink-0">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveMutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Save Video Clip')}
              </Button>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Resize video clip editor"
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-sm text-slate-400 hover:text-slate-600"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6 14h2v2H6v-2Zm4-4h2v6h-2v-6Zm4-4h2v10h-2V6Z" />
          </svg>
        </button>

        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">
                {warningMsg}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}