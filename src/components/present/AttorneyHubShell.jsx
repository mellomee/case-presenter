import React from 'react';
import { Link } from 'react-router-dom';
import AttorneyHub from '@/pages/AttorneyHub';

export default function AttorneyHubShell() {
  return (
    <div className="relative h-screen bg-slate-50">
      <div className="absolute right-4 top-4 z-30">
        <Link
          to="/Dashboard"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Exit to Dashboard
        </Link>
      </div>
      <AttorneyHub />
    </div>
  );
}