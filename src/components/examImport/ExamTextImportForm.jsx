import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function getPartyLabel(party) {
  return `${party.first_name} ${party.last_name}`.trim();
}

export default function ExamTextImportForm() {
  const [partyId, setPartyId] = useState('');
  const [examType, setExamType] = useState('');
  const [rawText, setRawText] = useState('');

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
    initialData: [],
  });

  const selectedParty = useMemo(
    () => parties.find((party) => party.id === partyId) || null,
    [parties, partyId]
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('importExamText', { partyId, examType, rawText });
      return response.data;
    },
  });

  const canSubmit = partyId && examType && rawText.trim();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900">Import buckets and questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">Party</p>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading parties...' : 'Select party'} />
              </SelectTrigger>
              <SelectContent>
                {parties.map((party) => (
                  <SelectItem key={party.id} value={party.id}>
                    {getPartyLabel(party)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">Exam type</p>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Cross">Cross</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">Paste your AI text</p>
          <Textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Paste BUCKET headings and question lines here..."
            className="min-h-[360px] resize-y"
          />
        </div>

        {selectedParty && examType && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Importing into <span className="font-semibold">{getPartyLabel(selectedParty)}</span> · <span className="font-semibold">{examType}</span>
          </div>
        )}

        {importMutation.data && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            Imported {importMutation.data.bucketCount} bucket(s) and {importMutation.data.questionCount} question(s).
          </div>
        )}

        {importMutation.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {importMutation.error.message}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => importMutation.mutate()}
            disabled={!canSubmit || importMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importMutation.isPending ? 'Importing...' : 'Import text'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}