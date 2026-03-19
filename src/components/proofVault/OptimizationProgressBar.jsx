import React from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OptimizationProgressBar({
  isVisible,
  isMinimized,
  onToggleMinimize,
  onClose,
  progressValue = 0,
  progressLabel = '',
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-lg shadow-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-blue-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-slate-900">PDF Optimization</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-600 hover:text-slate-900"
            onClick={onToggleMinimize}
          >
            {isMinimized ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-600 hover:text-slate-900"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">{progressLabel || 'Processing...'}</span>
            <span className="text-slate-600">{Math.round(progressValue)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${Math.max(5, progressValue)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}