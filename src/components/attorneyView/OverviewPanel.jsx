import React from 'react';
import { CheckCircle2, Circle, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function StatusIcon({ status }) {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
  if (status === 'current') return <Play className="w-4 h-4 text-blue-400 flex-shrink-0 fill-blue-400" />;
  return <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />;
}

export default function OverviewPanel({ flatList, currentIndex, onJumpTo, onClose }) {
  // Group items by bucket for display
  const grouped = flatList.reduce((acc, item, idx) => {
    const bucketId = item.bucket.id;
    if (!acc[bucketId]) {
      acc[bucketId] = { bucket: item.bucket, items: [] };
    }
    acc[bucketId].items.push({ item, idx });
    return acc;
  }, {});

  const groups = Object.values(grouped);

  return (
    <div className="flex flex-col h-full bg-slate-800 border-l border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Overview</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentIndex + 1} of {flatList.length} · {flatList.filter((_, i) => i < currentIndex).length} done
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-slate-700/50">
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${flatList.length > 0 ? ((currentIndex) / flatList.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto py-2">
        {groups.map(({ bucket, items }) => (
          <div key={bucket.id} className="mb-1">
            {/* Bucket heading */}
            <div className="px-4 py-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{bucket.name}</p>
            </div>

            {/* Items */}
            {items.map(({ item, idx }) => {
              const status = idx < currentIndex ? 'done' : idx === currentIndex ? 'current' : 'pending';
              const isBlock = item.data.block_type === 'AdmissionBlock';

              return (
                <button
                  key={item.data.id}
                  onClick={() => onJumpTo(idx)}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                    status === 'current'
                      ? 'bg-blue-600/15 border-l-2 border-blue-500'
                      : 'border-l-2 border-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <div className="mt-0.5">
                    <StatusIcon status={status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug line-clamp-2 ${
                      status === 'done'
                        ? 'text-slate-500 line-through'
                        : status === 'current'
                        ? 'text-white font-medium'
                        : 'text-slate-400'
                    }`}>
                      {item.data.text}
                    </p>
                    {isBlock && (
                      <span className="text-xs text-amber-500 mt-0.5 inline-block">Admission Block</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}