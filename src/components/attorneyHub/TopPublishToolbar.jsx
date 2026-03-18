import React from 'react';
import { Monitor, MonitorOff, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TopPublishToolbar({ proof, juryState, onUpdate }) {
  if (!proof) return null;

  const isPublished = juryState?.published_proof_id === proof.id && !juryState?.is_blank;
  const isBlankedThisProof = juryState?.published_proof_id === proof.id && juryState?.is_blank;
  const isOtherPublished = juryState?.published_proof_id && juryState.published_proof_id !== proof.id && !juryState?.is_blank;
  const publishable = ['Admitted', 'Demonstrative'].includes(proof.status) || proof.proof_category === 'Deposition';

  const exhibitNum = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '';
  const label = proof.status === 'Admitted'
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

  return (
    <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-2.5 flex items-center gap-2 flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Jury Screen</p>
        {isPublished ? (
          <p className="mt-1 text-xs font-semibold text-green-400 truncate">Live on Jury Screen</p>
        ) : isBlankedThisProof ? (
          <p className="mt-1 text-xs font-semibold text-amber-400 truncate">This proof is loaded but the jury screen is blanked</p>
        ) : isOtherPublished ? (
          <p className="mt-1 text-xs font-semibold text-amber-400 truncate">Another proof is currently live</p>
        ) : (
          <p className="mt-1 text-xs text-slate-500 truncate">Use these controls without scrolling.</p>
        )}
      </div>

      {isPublished ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdate({ is_blank: true })}
          className="gap-1.5 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
        >
          <MonitorOff className="w-3.5 h-3.5" /> Blank Screen
        </Button>
      ) : (
        <>
          {isBlankedThisProof && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate({ is_blank: false })}
              className="gap-1.5 border-green-700 text-green-400 hover:bg-green-950/30"
            >
              <Monitor className="w-3.5 h-3.5" /> Restore to Jury
            </Button>
          )}
          {publishable ? (
            <Button
              size="sm"
              onClick={handlePublish}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <SendHorizontal className="w-3.5 h-3.5" /> Publish to Jury
            </Button>
          ) : (
            <span className="text-xs text-slate-500 italic">Not publishable</span>
          )}
        </>
      )}
    </div>