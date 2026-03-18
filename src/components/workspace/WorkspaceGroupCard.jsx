import React, { useMemo, useState } from 'react';
import WorkspaceQuestionItem from './WorkspaceQuestionItem.jsx';
import WorkspaceProofFocusEditor from './WorkspaceProofFocusEditor.jsx';
import { buildAdmissionSteps } from '@/lib/admissionSteps';

export default function WorkspaceGroupCard({
  group,
  proofs = [],
  parties = [],
  proofFocuses = [],
  questions = [],
  admissionBlocks = [],
  admissionTemplates = [],
  onSaveGroup,
  onAddQuestion,
  onAddAdmissionBlock,
  onSaveQuestion,
  onAddFollowup,
  onCreateFocus,
  onDeleteFocus,
}) {
  const [name, setName] = useState(group.name || '');
  const [nodeLabel, setNodeLabel] = useState(group.node_label || '');
  const [whyItMatters, setWhyItMatters] = useState(group.why_it_matters || '');
  const [selectedProofId, setSelectedProofId] = useState(group.proof_id || '');
  const focusProof = useMemo(() => proofs.find((proof) => proof.id === selectedProofId) || null, [proofs, selectedProofId]);
  const topLevelQuestions = questions.filter((question) => !question.parent_question_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const sortedBlocks = [...admissionBlocks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => onSaveGroup(group.id, { name })} placeholder="Group name" className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700" />
        <input value={nodeLabel} onChange={(event) => setNodeLabel(event.target.value)} onBlur={() => onSaveGroup(group.id, { node_label: nodeLabel })} placeholder="Hub label" className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700" />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <textarea value={whyItMatters} onChange={(event) => setWhyItMatters(event.target.value)} onBlur={() => onSaveGroup(group.id, { why_it_matters: whyItMatters })} placeholder="Why this group matters" rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700" />
        <select value={selectedProofId} onChange={(event) => { setSelectedProofId(event.target.value); onSaveGroup(group.id, { proof_id: event.target.value || null }); }} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
          <option value="">No proof focus</option>
          {proofs.map((proof) => <option key={proof.id} value={proof.id}>{proof.formal_name || proof.name}</option>)}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onAddQuestion(group)} className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Add Question</button>
        <button onClick={() => focusProof && onAddAdmissionBlock(group, focusProof)} disabled={!focusProof} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-400">Add Admission Block</button>
      </div>

      <div className="mt-4">
        <WorkspaceProofFocusEditor
          proofs={proofs}
          parties={parties}
          group={group}
          focuses={proofFocuses}
          onCreateFocus={onCreateFocus}
          onDeleteFocus={onDeleteFocus}
        />
      </div>

      <div className="mt-4 space-y-3">
        {topLevelQuestions.map((question) => (
          <WorkspaceQuestionItem
            key={question.id}
            question={question}
            allQuestions={questions}
            onSaveQuestion={onSaveQuestion}
            onAddFollowup={onAddFollowup}
          />
        ))}
        {topLevelQuestions.length === 0 && <p className="text-sm text-slate-500">No questions yet.</p>}
      </div>

      {sortedBlocks.length > 0 && (
        <div className="mt-4 space-y-3">
          {sortedBlocks.map((block) => {
            const proof = proofs.find((item) => item.id === block.proof_id);
            const steps = buildAdmissionSteps(block, admissionTemplates, proof?.admitted_exhibit_num || proof?.joint_exhibit_num || '');
            return (
              <div key={block.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">Admission Block · {proof?.formal_name || proof?.name || 'Proof'}</p>
                <div className="mt-2 space-y-2">
                  {steps.map((step) => (
                    <div key={step.key} className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700">{step.label}</p>
                      <p className="mt-1 text-sm text-slate-800">{step.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}