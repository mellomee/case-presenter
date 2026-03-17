import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AttorneyView from '@/pages/AttorneyView';

export default function AttorneyViewShell() {
  return (
    <div className="relative h-screen">
      <div className="absolute top-4 right-4 z-50">
        <Link to="/Dashboard">
          <Button variant="outline" className="gap-2 bg-white/95 border-slate-300 text-slate-800 hover:bg-white shadow-md">
            <ArrowLeft className="w-4 h-4" />
            Exit to Dashboard
          </Button>
        </Link>
      </div>
      <AttorneyView />
    </div>
  );
}