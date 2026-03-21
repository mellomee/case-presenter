import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { parseExamV2TextImport } from '@/lib/examV2TextImport';

const EXAMPLE_TEXT = `PROOF: my new extract pages 1,3,5
- Go to Page 3, please read the highlighted text.
  -> Read text aloud
  @attach: some highlights
- What do you think?
  -> nah

GROUP: What human Factors
- What does the document show?
- Why does it matter?
  @notes: Follow-up question`;

export default function ExamV2TextImportDialog({
  open,
  onOpenChange,
  selectedParty = null,
  selectedExamType = 'Direct',
  availableRootProofs = [],
  allProofs = [],
  onImport,
}) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const validCount = preview?.rootItems?.length || 0;
  const totalQuestionCount = useMemo(
    () => preview?.rootItems?.reduce((sum, root) => sum + root.question_rows.length, 0) || 0,
    [preview]
  );

  const reset = () => {
    setRawText('');
    setPreview(null);
    setError('');
    setImporting(false);
  };

  const handlePreview = () => {
    if (!rawText.trim()) {
      setError('Paste your import text first.');
      return;
    }

    const nextPreview = parseExamV2TextImport({ rawText, availableRootProofs, allProofs });

    if (nextPreview.rootItems.length === 0 && nextPreview.errors.length === 0) {
      setError('No valid sections were found.');
      setPreview(null);
      return;
    }

    setError('');
    setPreview(nextPreview);
  };

  const handleImport = async () => {
    if (!preview?.rootItems?.length || !onImport) return;

    setImporting(true);
    setError('');

    try {
      await onImport(preview.rootItems);
      reset();
      onOpenChange(false);
    } catch (importError) {
      setError(importError.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) reset(); onOpenChange(nextOpen); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle>Text Import — Exam Builder V2</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Import target</p>
              <p className="mt-2">Party: {selectedParty ? `${selectedParty.first_name} ${selectedParty.last_name}` : 'Select a party first'}</p>
              <p>Exam Type: {selectedExamType}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">Paste your text</p>
                  <Textarea
                    value={rawText}
                    onChange={(event) => setRawText(event.target.value)}
                    placeholder="Paste PROOF / GROUP sections here..."
                    className="min-h-[420px] resize-y border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-900">Supported format</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    <li><span className="font-medium">PROOF:</span> starts a proof section</li>
                    <li><span className="font-medium">GROUP:</span> starts a question group</li>
                    <li><span className="font-medium">- Question</span> adds a question</li>
                    <li><span className="font-medium">Indented - Question</span> creates a follow-up</li>
                    <li><span className="font-medium">-&gt; Answer</span> sets expected answer</li>
                    <li><span className="font-medium">@attach:</span> proof1 | proof2</li>
                    <li><span className="font-medium">@notes:</span> adds attorney notes</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs whitespace-pre-wrap text-slate-700">
{EXAMPLE_TEXT}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handlePreview}>
                Review Import
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{validCount}</p>
                <p className="text-xs text-emerald-700">Sections</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{totalQuestionCount}</p>
                <p className="text-xs text-blue-700">Questions</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${preview.errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${preview.errors.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>{preview.errors.length}</p>
                <p className={`text-xs ${preview.errors.length > 0 ? 'text-red-700' : 'text-slate-600'}`}>Lines Skipped</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3">
              {preview.rootItems.map((root, index) => (
                <div key={`${root.exam_order}-${root.root_item_name}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Section {index + 1}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{root.root_item_name}</p>
                      <p className="mt-1 text-xs text-slate-600">{root.item_type === 'proof' ? 'Proof' : 'Question Group'} · {root.question_rows.length} questions</p>
                    </div>
                    {root.item_type === 'proof' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : null}
                  </div>
                </div>
              ))}
            </div>

            {preview.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Skipped lines</p>
                <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                  {preview.errors.map((entry) => (
                    <div key={`${entry.rowNumber}-${entry.label}`} className="text-xs text-red-700">
                      <p className="font-semibold">Line {entry.rowNumber}: {entry.label}</p>
                      {entry.rowErrors.map((message, index) => <p key={index}>• {message}</p>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => setPreview(null)} disabled={importing}>
                Back
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? 'Importing…' : `Import ${validCount} Sections`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}