import React from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ProofPicker from './ProofPicker.jsx';

const createLocalId = () => `path-q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function createNode(path, defaultPartyId) {
  const id = createLocalId();
  return {
    id,
    local_id: id,
    text: '',
    expected_answer: '',
    notes: '',
    proof_ids: [],
    party_ids: defaultPartyId ? [defaultPartyId] : [],
    children: [],
    admission_path: path,
    isEditing: true,
  };
}

function updateNode(nodes, localId, updater) {
  return nodes.map((node) => {
    if (node.local_id === localId) {
      return updater(node);
    }

    return {
      ...node,
      children: updateNode(node.children || [], localId, updater),
    };
  });
}

function removeNode(nodes, localId) {
  return nodes
    .filter((node) => node.local_id !== localId)
    .map((node) => ({
      ...node,
      children: removeNode(node.children || [], localId),
    }));
}

function addChildNode(nodes, parentLocalId, childNode) {
  return nodes.map((node) => {
    if (node.local_id === parentLocalId) {
      return {
        ...node,
        children: [...(node.children || []), childNode],
      };
    }

    return {
      ...node,
      children: addChildNode(node.children || [], parentLocalId, childNode),
    };
  });
}

function PathQuestionNode({
  node,
  pathNodes,
  onPathChange,
  parties,
  proofs,
  defaultPartyId,
  depth = 0,
}) {
  const updateCurrent = (updater) => {
    onPathChange(updateNode(pathNodes, node.local_id, updater));
  };

  const handleDelete = () => {
    onPathChange(removeNode(pathNodes, node.local_id));
  };

  const handleAddChild = () => {
    onPathChange(addChildNode(pathNodes, node.local_id, createNode(node.admission_path, defaultPartyId)));
  };

  const toggleParty = (partyId) => {
    updateCurrent((current) => ({
      ...current,
      party_ids: current.party_ids?.includes(partyId)
        ? current.party_ids.filter((id) => id !== partyId)
        : [...(current.party_ids || []), partyId],
    }));
  };

  const toggleProof = (proofId) => {
    updateCurrent((current) => ({
      ...current,
      proof_ids: current.proof_ids?.includes(proofId)
        ? current.proof_ids.filter((id) => id !== proofId)
        : [...(current.proof_ids || []), proofId],
    }));
  };

  const cancelEditing = () => {
    if (!node.text?.trim()) {
      handleDelete();
      return;
    }

    updateCurrent((current) => ({
      ...current,
      isEditing: false,
    }));
  };

  return (
    <div className={`${depth > 0 ? 'ml-4 pl-4 border-l border-slate-200' : ''}`}>
      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3 shadow-sm">
        {node.isEditing ? (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {depth === 0 ? 'Path Question' : 'Follow-up Question'}
              </p>
              <Textarea
                value={node.text}
                onChange={(event) => updateCurrent((current) => ({ ...current, text: event.target.value }))}
                rows={2}
                placeholder="Type the question..."
                className="resize-none"
                autoFocus={!node.text}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">Expected Answer</p>
                <Textarea
                  value={node.expected_answer || ''}
                  onChange={(event) => updateCurrent((current) => ({ ...current, expected_answer: event.target.value }))}
                  rows={2}
                  placeholder="Optional expected answer"
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">Notes</p>
                <Input
                  value={node.notes || ''}
                  onChange={(event) => updateCurrent((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional notes / strategy"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Attached Parties</p>
              <div className="flex flex-wrap gap-2">
                {parties.map((party) => {
                  const isSelected = node.party_ids?.includes(party.id);
                  return (
                    <button
                      key={party.id}
                      type="button"
                      onClick={() => toggleParty(party.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {party.first_name} {party.last_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <ProofPicker selectedProofIds={node.proof_ids || []} onToggle={toggleProof} />

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => updateCurrent((current) => ({ ...current, isEditing: false }))}
                disabled={!node.text?.trim()}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-3.5 h-3.5" /> Done
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cancelEditing} className="gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 leading-relaxed">{node.text}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(node.party_ids || []).length > 0 && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      {(node.party_ids || []).length} party{(node.party_ids || []).length !== 1 ? 'ies' : ''}
                    </span>
                  )}
                  {(node.proof_ids || []).length > 0 && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      {(node.proof_ids || []).length} proof{(node.proof_ids || []).length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {node.children?.length > 0 && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {node.children.length} follow-up{node.children.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCurrent((current) => ({ ...current, isEditing: true }))}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {node.expected_answer && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 mb-1">Expected Answer</p>
                <p className="text-sm text-slate-700">{node.expected_answer}</p>
              </div>
            )}

            {node.notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1">Notes</p>
                <p className="text-sm text-slate-700">{node.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleAddChild} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Follow-up
              </Button>
            </div>
          </>
        )}
      </div>

      {node.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <PathQuestionNode
              key={child.local_id}
              node={child}
              pathNodes={pathNodes}
              onPathChange={onPathChange}
              parties={parties}
              proofs={proofs}
              defaultPartyId={defaultPartyId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PathSection({ title, subtitle, pathKey, toneClass, questions, onChange, proofs, parties, defaultPartyId }) {
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <Button type="button" size="sm" onClick={() => onChange([...questions, createNode(pathKey, defaultPartyId)])} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-3 text-xs text-slate-500">
          No questions in this path yet.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((node) => (
            <PathQuestionNode
              key={node.local_id}
              node={node}
              pathNodes={questions}
              onPathChange={onChange}
              parties={parties}
              proofs={proofs}
              defaultPartyId={defaultPartyId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdmissionPathQuestionsEditor({ value, onChange, proofs, parties, defaultPartyId }) {
  const admitted = value?.admitted || [];
  const notAdmitted = value?.not_admitted || [];

  return (
    <div className="space-y-4">
      <PathSection
        title="Path 1 — If Admitted / Demonstrative"
        subtitle="Questions to ask after the proof is admitted as an exhibit or demonstrative."
        pathKey="admitted"
        toneClass="border-green-200 bg-green-50/70"
        questions={admitted}
        onChange={(next) => onChange({ admitted: next, not_admitted: notAdmitted })}
        proofs={proofs}
        parties={parties}
        defaultPartyId={defaultPartyId}
      />

      <PathSection
        title="Path 2 — If Not Admitted"
        subtitle="Questions to use if the court does not admit the proof and you need to pivot."
        pathKey="not_admitted"
        toneClass="border-red-200 bg-red-50/70"
        questions={notAdmitted}
        onChange={(next) => onChange({ admitted, not_admitted: next })}
        proofs={proofs}
        parties={parties}
        defaultPartyId={defaultPartyId}
      />
    </div>
  );
}