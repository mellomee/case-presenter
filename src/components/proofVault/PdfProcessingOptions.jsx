import React from 'react';

function CheckboxRow({ checked, onChange, title, description, disabled = false }) {
  return (
    <label className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 ${disabled ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <div>
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-500 mt-1">{description}</div>
      </div>
    </label>
  );
}

export default function PdfProcessingOptions({
  enabled = true,
  onEnabledChange,
  showMasterToggle = false,
  addCoverPage,
  onAddCoverPageChange,
  addPageNumbers,
  onAddPageNumbersChange,
  optimizePdf,
  onOptimizePdfChange,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      {showMasterToggle && (
        <CheckboxRow
          checked={enabled}
          onChange={onEnabledChange}
          title="Process PDF for viewer"
          description="Create a new Dropbox copy with optional cover page, page numbers, and Adobe optimization."
        />
      )}

      {(!showMasterToggle || enabled) && (
        <div className="space-y-3">
          <CheckboxRow
            checked={addCoverPage}
            onChange={onAddCoverPageChange}
            title="Add exhibit cover page"
            description="Adds a clean first page using the proof name and exhibit number."
          />
          <CheckboxRow
            checked={addPageNumbers}
            onChange={onAddPageNumbersChange}
            title="Add page numbers"
            description="Numbers the document pages for easier use in the viewer and at trial."
          />
          <CheckboxRow
            checked={optimizePdf}
            onChange={onOptimizePdfChange}
            title="Compress + optimize for viewer"
            description="Runs Adobe compression and linearization before saving the new Dropbox copy."
          />
        </div>
      )}
    </div>
  );
}