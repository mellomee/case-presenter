import React, { useState, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { AlertCircle, Play, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ReactPlayer from 'react-player';

export default function CreateVideoClipModal({ open, onClose, parentProof }) {
  const queryClient = useQueryClient();
  const playerRef = useRef(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { distance: 8 }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Proof.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      resetForm();
      onClose();
    },
    onError: (error) => {
      setWarningMsg(`Error creating video clip: ${error.message}`);
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
  };

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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = segments.findIndex((s) => s.id === active.id);
      const newIndex = segments.findIndex((s) => s.id === over.id);
      setSegments(arrayMove(segments, oldIndex, newIndex));
    }
  };

  const handleSubmit = () => {
    if (!internalName.trim()) {
      setWarningMsg('Internal Name is required');
      setShowWarning(true);
      return;
    }
    if (!formalName.trim()) {
      setWarningMsg('Formal Name is required');
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
      parent_proof_id: parentProof.id,
      party_id: parentProof.party_id || null,
      status: parentProof.status === 'Draft' ? 'Draft' : parentProof.status,
      category_id: parentProof.category_id || null,
      video_url: parentProof.video_url || parentProof.file_url,
      file_url: parentProof.file_url || null,
      draft_exhibit_num: exhibitNum.trim() || null,
      description: description.trim() || null,
      video_clips: segments,
    };

    createMutation.mutate(clipData);
  };

  if (!parentProof) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🎬 New Video Clip</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Parent info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                From: {parentProof.formal_name}
              </p>
              <p className="text-xs text-blue-700 mt-1">Video</p>
            </div>
          </div>

          {/* Video player */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Video</label>
            <div className="bg-slate-900 rounded-lg overflow-hidden aspect-video border border-slate-200">
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
            <p className="text-xs text-slate-500 mt-2">
              Duration: {secondsToTime(duration)} · Current: {secondsToTime(currentTime)}
            </p>
          </div>

          {/* Mark start/end controls */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Start (hh:mm:ss)</label>
              <Input
                type="text"
                value={tempStartTime}
                onChange={(e) => setTempStartTime(e.target.value)}
                placeholder="00:00:00"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">End (hh:mm:ss)</label>
              <Input
                type="text"
                value={tempEndTime}
                onChange={(e) => setTempEndTime(e.target.value)}
                placeholder="00:00:00"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkStart}
                className="flex-1"
              >
                <Play className="w-3 h-3 mr-1" />
                Mark Start
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkEnd}
                className="flex-1"
              >
                <Play className="w-3 h-3 mr-1" />
                Mark End
              </Button>
            </div>
          </div>

          {/* Segments list */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">Segments (drag to reorder)</label>
            {segments.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={segments.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {segments.map((segment, idx) => (
                      <SegmentItem
                        key={segment.id}
                        id={segment.id}
                        segment={segment}
                        index={idx}
                        onDelete={handleDeleteSegment}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-slate-500 italic">No segments yet</p>
            )}
          </div>

          {/* Add segment button */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Segment Label (optional)</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 'Testimony about accident'"
                value={segmentLabel}
                onChange={(e) => setSegmentLabel(e.target.value)}
              />
              <Button onClick={handleAddSegment} className="bg-green-600 hover:bg-green-700">
                + Add Segment
              </Button>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Internal Name *</label>
              <Input
                placeholder="e.g. Witness testimony clip 1"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Formal Name *</label>
              <Input
                placeholder="e.g. Deposition Clip — Accident Account"
                value={formalName}
                onChange={(e) => setFormalName(e.target.value)}
              />
            </div>
          </div>

          {/* Exhibit number */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Exhibit # (optional)</label>
            <Input
              placeholder="e.g. A-1a"
              value={exhibitNum}
              onChange={(e) => setExhibitNum(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Description (optional)</label>
            <Input
              placeholder="Additional notes about this clip"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? 'Creating...' : 'Save Video Clip'}
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