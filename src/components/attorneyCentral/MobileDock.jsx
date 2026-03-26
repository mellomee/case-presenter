import React from 'react';
import { FileText, MessageSquare, Tv, Users } from 'lucide-react';

export default function MobileDock({
  onOpenExhibits,
  onOpenQuestions,
  onToggleWitness,
  onToggleJury,
  witnessPublished,
  juryPublished,
  juryDisabled,
  isDemoMode = false,
}) {
  const items = [
    { label: 'Exhibits', icon: FileText, onClick: onOpenExhibits },
    { label: 'Questions', icon: MessageSquare, onClick: onOpenQuestions },
    { label: witnessPublished ? 'Hide W' : 'Witness', icon: Users, onClick: onToggleWitness, disabled: isDemoMode },
    { label: juryPublished ? 'Hide J' : 'Jury', icon: Tv, onClick: onToggleJury, disabled: juryDisabled || isDemoMode },
  ];

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 rounded-[28px] border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[22px] text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-45"
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}