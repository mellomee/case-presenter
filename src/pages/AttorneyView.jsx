import React from 'react';
import { Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AttorneyView() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Tv className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Attorney Trial Screen</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Open Jury View</Button>
            <Button className="bg-blue-600 hover:bg-blue-700">● Publish Live</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-2">
            <Card className="p-8 border-slate-200">
              <div className="text-slate-500 text-sm mb-4">Q 0 / 0</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                No questions loaded yet
              </h3>
              <p className="text-slate-600">
                Select a case and examination from the Exam Builder to load questions here.
              </p>
            </Card>
          </div>

          {/* Preview Pane */}
          <div className="lg:col-span-1">
            <Card className="p-8 border-slate-200 bg-white">
              <div className="text-slate-500 text-sm font-semibold mb-4">PREVIEW</div>
              <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-center">
                  <div className="text-slate-400 text-4xl mb-2">⚖️</div>
                  <p className="text-slate-500 text-sm">No content published</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}