import React from 'react';
import { Monitor, MonitorOff, Send, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function JuryPublishBar({ proof, juryState, onUpdate }) {
  if (!proof) return null;

  const isPublished = juryState?.published_proof_id === proof.id && !juryState?.is_blank;
  const isOtherPublished = juryState?.published_proof_id && juryState.published_proof_id !== proof.id && !juryState?.is_blank;

  const publishable = ['Admitted', 'Demonstrative'].includes(proof.status) || proof.proof_category === 'Deposition';

  const exhibitNum =
    proof.admitted_exhibit_num ||
    proof.demonstrative_exhibit_num ||
    proof.joint_exhibit_num ||
    '';

  const label =
    proof.status === 'Admitted'
      ? `Exhibit ${exhibitNum}`
      : proof.status === 'Demonstrative'
      ? `Demonstrative ${exhibitNum}`
      : proof.formal_name || proof.name;

  const handlePublish = () => {
    onUpdate({
      published_proof_id: proof.id,
      is_blank: false,
      exhibit_label: label,
      pdf_page: 1,
      video_time: 0,
      is_playing: false,
    });
  };

  const handleBlank = () => {
    onUpdate({ is_blank: true });
  };

  const handleUnblank = () => {
    onUpdate({ is_blank: false });
  };

  return (
    <div className="px-4 py-2.5 border-t border-slate-700 bg-slate-800/80 flex items-center gap-2 flex-wrap">
      {isPublished ? (
        <>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="text-xs text-green-400 font-semibold truncate">Live on Jury Screen</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBlank}
            className="gap-1.5 h-7 text-xs border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <MonitorOff className="w-3 h-3" /> Blank Screen
          </Button>
        </>
      ) : (
        <>
          {isOtherPublished && (
            <span className="text-xs text-amber-400 flex-1 truncate">Other proof is live</span>
          )}
          {juryState?.is_blank && juryState?.published_proof_id === proof.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnblank}
              className="gap-1.5 h-7 text-xs border-green-700 text-green-400 hover:bg-green-950/30"
            >
              <Monitor className="w-3 h-3" /> Restore to Jury
            </Button>
          )}
          {publishable ? (
            <Button
              size="sm"
              onClick={handlePublish}
              className="gap-1.5 h-7 text-xs bg-blue-600 hover:bg-blue-700 ml-auto"
            >
              <SendHorizontal className="w-3 h-3" /> Publish to Jury
            </Button>
          ) : (
            <span className="text-xs text-slate-500 ml-auto italic">Not publishable (Draft/Joint)</span>
          )}
        </>
      )}
    </div>
  );
}