import React from 'react';
import { GripVertical } from 'lucide-react';

export default function ColumnResizeHandle({ onMouseDown, title = 'Drag to resize' }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-3 flex-shrink-0 cursor-col-resize relative group hidden xl:flex items-center justify-center"
      title={title}
    >
      <div className="w-px h-full bg-slate-700 group-hover:bg-blue-500 transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center">
        <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  );
}