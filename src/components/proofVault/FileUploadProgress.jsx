import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function FileUploadProgress({ uploads }) {
  return (
    <div className="fixed bottom-4 right-4 w-96 space-y-2 pointer-events-none">
      {uploads.map((upload) => (
        <Card key={upload.id} className="p-4 pointer-events-auto shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {upload.status === 'uploading' && (
                <Loader className="w-5 h-5 text-blue-500 animate-spin" />
              )}
              {upload.status === 'completed' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {upload.status === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{upload.filename}</p>
              <p className="text-xs text-slate-500 mt-1">
                {upload.status === 'uploading' && `${upload.progress}% uploaded`}
                {upload.status === 'completed' && 'Upload complete'}
                {upload.status === 'error' && `Error: ${upload.error}`}
              </p>

              {upload.status === 'uploading' && (
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}