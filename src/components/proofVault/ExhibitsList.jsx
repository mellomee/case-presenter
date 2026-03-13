import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Image, Play, MoreVertical, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ExhibitsList({ exhibits }) {
  const [expandedProofIds, setExpandedProofIds] = useState(new Set());

  const { data: allProofs = [] } = useQuery({
    queryKey: ['proofs'],
    queryFn: () => base44.entities.Proof.list().catch(() => []),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list().catch(() => []),
  });

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

  const getPartyColor = (partyId) => {
    const colors = [
      'bg-red-100 text-red-800',
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
    ];
    const party = parties.find((p) => p.id === partyId);
    if (!party) return colors[0];
    const index = parties.indexOf(party) % colors.length;
    return colors[index];
  };

  const getPartyName = (partyId) => {
    const party = parties.find((p) => p.id === partyId);
    return party ? `${party.first_name} ${party.last_name}` : 'Unassigned';
  };

  const getChildProofs = (parentId) => {
    return allProofs.filter((p) => p.parent_proof_id === parentId);
  };

  const buildExhibitNumberHistory = (exhibit) => {
    const history = [];
    if (exhibit.draft_exhibit_num) {
      history.push({ num: exhibit.draft_exhibit_num, status: 'Draft', color: 'bg-gray-200 text-gray-700' });
    }
    if (exhibit.joint_exhibit_num) {
      history.push({ num: exhibit.joint_exhibit_num, status: 'Joint', color: 'bg-blue-200 text-blue-700' });
    }
    if (exhibit.admitted_exhibit_num) {
      history.push({ num: exhibit.admitted_exhibit_num, status: 'Admitted', color: 'bg-green-200 text-green-700' });
    }
    if (exhibit.demonstrative_exhibit_num) {
      history.push({ num: exhibit.demonstrative_exhibit_num, status: 'Demo', color: 'bg-purple-200 text-purple-700' });
    }
    return history;
  };

  const toggleExpanded = (proofId) => {
    const newExpanded = new Set(expandedProofIds);
    if (newExpanded.has(proofId)) {
      newExpanded.delete(proofId);
    } else {
      newExpanded.add(proofId);
    }
    setExpandedProofIds(newExpanded);
  };

  const ProofTile = ({ proof, isChild = false }) => {
    const Icon = getFileIcon(proof.file_type);
    const childProofs = getChildProofs(proof.id);
    const hasChildren = childProofs.length > 0;
    const isExpanded = expandedProofIds.has(proof.id);
    const history = buildExhibitNumberHistory(proof);

    return (
      <div key={proof.id}>
        <Card className={`p-4 hover:shadow-md transition-shadow ${isChild ? 'ml-4 mt-2' : ''}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleExpanded(proof.id)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                  />
                </button>
              )}
              <Icon className="w-8 h-8 text-slate-400" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          <h3 className="font-semibold text-slate-900 mb-2 truncate">
            {proof.formal_name || proof.name}
          </h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-medium px-2 py-1 rounded bg-slate-200 text-slate-700">
              {proof.file_type}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(proof.status)}`}>
              {proof.status}
            </span>
            {proof.party_id && (
              <span className={`text-xs font-medium px-2 py-1 rounded ${getPartyColor(proof.party_id)}`}>
                {getPartyName(proof.party_id)}
              </span>
            )}
          </div>

          {/* Exhibit Number History */}
          {history.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {history.map((item, idx) => (
                <span
                  key={idx}
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${item.color}`}
                >
                  {item.status} {item.num}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Child Proofs */}
        {hasChildren && isExpanded && (
          <div className="space-y-2 mt-2">
            {childProofs.map((child) => (
              <ProofTile key={child.id} proof={child} isChild={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const parentProofs = exhibits.filter((p) => !p.parent_proof_id);

  if (parentProofs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No exhibits found</p>
      </Card>
    );
  }

  return <div className="space-y-3">{parentProofs.map((proof) => <ProofTile key={proof.id} proof={proof} />)}</div>;
}