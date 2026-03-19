import React from 'react';
import { ChevronUp, ChevronDown, X, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BulkImportProgressBar({
  isVisible,
  isMinimized,
  onToggleMinimize,
  onClose,
  progressValue = 0,
  progressLabel = '',
  currentFile = '',
  isPaused = false,
  onPauseToggle,
  onStop,
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-lg shadow-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-blue-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-slate-900">Bulk Import</span>
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
          {currentFile && (
            <div className="text-xs text-slate-600 truncate">
              <span className="font-medium">Current:</span> {currentFile}
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">{progressLabel || 'Importing...'}</span>
            <span className="text-slate-600">{Math.round(progressValue)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all duration-300 ${isPaused ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ width: `${Math.max(5, progressValue)}%` }}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={onPauseToggle}
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3" /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" /> Pause
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
              onClick={onStop}
            >
              <Square className="w-3 h-3" /> Stop
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}