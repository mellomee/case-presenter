import React from 'react';
import { Card } from '@/components/ui/card';
import { FileText, Image, Play } from 'lucide-react';
import ProofActionMenu from './ProofActionMenu';

export default function ExhibitsList({ exhibits, status, onEdit, onView, onDelete }) {
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'Image':
        return Image;
      case 'Video':
        return Play;
      case 'PDF':
      default:
        return FileText;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Draft: 'bg-gray-100 text-gray-800',
      Joint: 'bg-blue-100 text-blue-800',
      Admitted: 'bg-green-100 text-green-800',
      Demonstrative: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (exhibits.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No exhibits found</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exhibits.map((exhibit) => {
        const Icon = getFileIcon(exhibit.file_type);
        const exhibitNum =
          exhibit.status === 'Draft'
            ? exhibit.draft_exhibit_num
            : exhibit.status === 'Joint'
              ? exhibit.joint_exhibit_num
              : exhibit.status === 'Admitted'
                ? exhibit.admitted_exhibit_num
                : exhibit.demonstrative_exhibit_num;

        return (
          <Card key={exhibit.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <Icon className="w-8 h-8 text-slate-400" />
              <ProofActionMenu proof={exhibit} status={exhibit.status} onEdit={onEdit} onView={onView} onDelete={onDelete} />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1 truncate">
              {exhibit.formal_name || exhibit.name}
            </h3>
            <p className="text-xs text-slate-500 mb-3">{exhibit.file_type}</p>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(exhibit.status)}`}>
                {exhibitNum ? `${exhibit.status} ${exhibitNum}` : exhibit.status}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}