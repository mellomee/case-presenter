import React from 'react';

export default function JuryView() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-white">
      {/* Default blank jury screen with scale icon */}
      <div className="text-center">
        <div className="text-8xl mb-6 opacity-20">⚖️</div>
        <p className="text-slate-400 text-lg">Waiting for content...</p>
      </div>
    </div>
  );
}