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

export default function CreateVideoClipModal({ open, onClose, parentProof, onSuccess }) {
  const queryClient = useQueryClient();
  const playerRef = useRef(null);
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
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);

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
    setCurrentTime(0);
    setWarningMsg('');
    setShowWarning(false);
    setWorkspaceCollapsed(false);
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
        }))
      );
      setSegmentLabel('');
      setTempStartTime('00:00:00');
      setTempEndTime('00:00:00');
      setCurrentTime(0);
      setWarningMsg('');
      setShowWarning(false);
      return;
    }

    resetForm();
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
    };

    setSegments([...segments, newSegment]);
    setSegmentLabel('');
  };

  const handleDeleteSegment = (id) => {
    setSegments(segments.filter((s) => s.id !== id));
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

    const clipData = {
      proof_category: parentProof.proof_category,
      file_type: 'Video',
      proof_child_type: 'VideoClip',
      name: internalName.trim(),
      formal_name: formalName.trim(),
      parent_proof_id: isEditing ? parentProof.parent_proof_id : parentProof.id,
      party_id: parentProof.party_id || null,
      status: parentProof.status === 'Draft' ? 'Draft' : parentProof.status,
      category_id: parentProof.category_id || null,
      proof_type_category_id: parentProof.proof_type_category_id,
      video_url: parentProof.video_url || parentProof.file_url,
      file_url: parentProof.file_url || null,
      draft_exhibit_num: exhibitNum.trim() || null,
      description: description.trim() || null,
      video_clips: segments.map(({ id, ...segment }) => segment),
    };

    saveMutation.mutate(clipData);
  };

  if (!parentProof) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Video Clip' : '🎬 New Video Clip'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Parent info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {isEditing ? `Editing: ${parentProof.formal_name || parentProof.name}` : `From: ${parentProof.formal_name}`}
              </p>
              <p className="text-xs text-blue-700 mt-1">Video</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="flex h-[70vh] max-h-[70vh] min-h-0 overflow-hidden">
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
                segmentLabel={segmentLabel}
                onSegmentLabelChange={setSegmentLabel}
                onMarkStart={handleMarkStart}
                onMarkEnd={handleMarkEnd}
                onAddSegment={handleAddSegment}
                currentTimeLabel={secondsToTime(currentTime)}
                durationLabel={secondsToTime(duration)}
                segments={segments}
                onDeleteSegment={handleDeleteSegment}
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

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
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