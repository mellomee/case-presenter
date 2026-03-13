import React, { useState } from 'react';
import { FileText, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProofViewer({ proof }) {
  const [showDetails, setShowDetails] = useState(true);

  const getFileIcon = (url) => {
    if (!url) return null;
    const ext = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'document';
  };

  const fileType = getFileIcon(proof.file_url);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-700/50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">{proof.title}</h2>
            {proof.exhibit_number && (
              <p className="text-sm text-blue-400 font-medium">Exhibit {proof.exhibit_number}</p>
            )}
          </div>
          {proof.file_url && (
            <a href={proof.file_url} download className="ml-4">
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </a>
          )}
        </div>

        {proof.description && (
          <p className="text-sm text-slate-300">{proof.description}</p>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-slate-900">
        {proof.file_url ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            {fileType === 'image' ? (
              <img
                src={proof.file_url}
                alt={proof.title}
                className="max-w-full max-h-full object-contain rounded"
              />
            ) : fileType === 'video' ? (
              <video
                src={proof.file_url}
                controls
                className="max-w-full max-h-full rounded"
              />
            ) : fileType === 'pdf' ? (
              <iframe
                src={proof.file_url}
                className="w-full h-full rounded"
                title={proof.title}
              />
            ) : (
              <div className="text-center">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">File preview not available</p>
                <a href={proof.file_url} download>
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4" />
                    Download File
                  </Button>
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No file attached</p>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      {(proof.notes || proof.category_id || proof.proof_type_id) && (
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-700/30 max-h-32 overflow-y-auto">
          {proof.notes && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-400 mb-1">NOTES:</p>
              <p className="text-sm text-slate-300">{proof.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}