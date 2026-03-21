import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExamTextFormatCard() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900">Paste format</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        <p>Use a bucket heading, then list questions under it. Optional answer lines can go underneath with an arrow.</p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs whitespace-pre-wrap text-slate-700">
{`BUCKET 1 — IDENTITY / FOUNDATION

Your name is Keroles, correct?
→ (Yes)

You were present in the vehicle involved in this incident?
→ (Yes)

BUCKET 2 — RELATIONSHIP

You knew Jake before that day?
→ (Yes)`}
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>Each BUCKET line creates one bucket.</li>
          <li>Each question line becomes a question.</li>
          <li>The line starting with → becomes the expected answer for the question above it.</li>
          <li>Trial points are left blank so you can assign them later if needed.</li>
        </ul>
      </CardContent>
    </Card>
  );
}