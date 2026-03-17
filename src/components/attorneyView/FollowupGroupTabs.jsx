import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

function NestedChildTree({ item, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-4 pl-3 border-l border-slate-700' : ''}`}>
      <div
        className={`flex items-start gap-2 py-2 ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={() => hasChildren && setOpen((value) => !value)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
        ) : (
          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          </div>
        )}
        <p className="text-sm text-slate-300 leading-relaxed">{item.data.text}</p>
      </div>
      {open && hasChildren && (
        <div className="mt-0.5">
          {item.children.map((child) => (
            <NestedChildTree key={child.data.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowupGroupCard({ title, items }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = items[currentIndex] || null;
  const nextItem = items[currentIndex + 1] || null;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-4 text-sm text-slate-500">
        No {title.toLowerCase()} follow-up questions.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title} Follow-up</p>
          <p className="text-xs text-slate-500 mt-0.5">{currentIndex + 1} / {items.length}</p>
        </div>
        <Badge className="bg-slate-800 text-slate-300 border border-slate-700">{items.length} total</Badge>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4">
          <p className="text-base font-medium text-white leading-relaxed">{currentItem.data.text}</p>
          {currentItem.data.expected_answer && (
            <p className="text-sm text-green-300 mt-3">Expected: {currentItem.data.expected_answer}</p>
          )}
          {currentItem.data.notes && (
            <p className="text-sm text-amber-300 mt-2">Notes: {currentItem.data.notes}</p>
          )}
          {currentItem.children?.length > 0 && (
            <div className="mt-4 rounded-lg bg-slate-900/70 p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nested Follow-ups</p>
              {currentItem.children.map((child) => (
                <NestedChildTree key={child.data.id} item={child} />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Up Next</p>
          {nextItem ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
              <p className="text-sm text-slate-300 leading-relaxed">{nextItem.data.text}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-500 italic">
              End of {title.toLowerCase()} follow-ups
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Previous
          </Button>
          <Button
            size="sm"
            onClick={() => setCurrentIndex((value) => Math.min(items.length - 1, value + 1))}
            disabled={currentIndex >= items.length - 1}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function LegacyFollowups({ items }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg bg-slate-900/50 p-3 space-y-0.5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Other Follow-up Questions</p>
      {items.map((child) => (
        <NestedChildTree key={child.data.id} item={child} />
      ))}
    </div>
  );
}

export default function FollowupGroupTabs({ children = [] }) {
  const grouped = useMemo(() => {
    const forgot = [];
    const deny = [];
    const other = [];

    children.forEach((child) => {
      if (child.data.follow_up_group === 'Forgot') forgot.push(child);
      else if (child.data.follow_up_group === 'Deny') deny.push(child);
      else other.push(child);
    });

    return { forgot, deny, other };
  }, [children]);

  const [activeTab, setActiveTab] = useState(grouped.forgot.length > 0 ? 'Forgot' : 'Deny');
  const hasGrouped = grouped.forgot.length > 0 || grouped.deny.length > 0;

  if (!hasGrouped && grouped.other.length === 0) return null;

  return (
    <div className="space-y-3">
      {hasGrouped && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 overflow-hidden">
          <div className="px-4 pt-4 pb-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Follow-up Groups</p>
            <div className="inline-flex rounded-lg bg-slate-800 p-1 gap-1">
              {['Forgot', 'Deny'].map((tab) => {
                const count = tab === 'Forgot' ? grouped.forgot.length : grouped.deny.length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4">
            <FollowupGroupCard title={activeTab} items={activeTab === 'Forgot' ? grouped.forgot : grouped.deny} />
          </div>
        </div>
      )}

      <LegacyFollowups items={grouped.other} />
    </div>
  );
}