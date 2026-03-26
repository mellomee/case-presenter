import React from 'react';
import { ChevronRight, FolderKanban } from 'lucide-react';
import { getProofDisplayName, parseIdsField } from '@/lib/examV2Utils';
import AttorneyCentralProofThumb from '@/components/attorneyCentral/AttorneyCentralProofThumb.jsx';
import { buildQuestionTree, getProofKindLabel, getProofNumber, getProofStatusConfig } from '@/lib/attorneyCentralUtils';

const PARTY_SIDE_ORDER = ['Plaintiff', 'Defense', 'Neutral'];

function comparePartiesByFirstName(a, b) {
  const firstComparison = String(a?.first_name || '').localeCompare(String(b?.first_name || ''), undefined, { sensitivity: 'base' });
  if (firstComparison !== 0) return firstComparison;
  return String(a?.last_name || '').localeCompare(String(b?.last_name || ''), undefined, { sensitivity: 'base' });
}

function renderGroupedPartyOptions(parties = []) {
  const groups = PARTY_SIDE_ORDER
    .map((side) => ({ side, items: [...parties].filter((party) => party.side === side).sort(comparePartiesByFirstName) }))
    .filter((group) => group.items.length > 0);

  return groups.map((group) => (
    <optgroup key={group.side} label={group.side}>
      {group.items.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
    </optgroup>
  ));
}

function LinkedProofChip({ proof, isSelected, localDecision, onClick }) {
  const status = getProofStatusConfig(proof, proof.status === 'Joint' ? localDecision : null);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition ${isSelected ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300'}`}
    >
      <div className="flex gap-3">
        <AttorneyCentralProofThumb proof={proof} className="h-20 w-16 flex-shrink-0 border border-stone-200" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${isSelected ? 'border-white/20 bg-white/10 text-white' : status.accent}`}>
              {getProofNumber(proof)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white' : status.pill}`}>
              {status.label}
            </span>
          </div>
          <p className={`mt-2 text-sm font-semibold ${isSelected ? 'text-white' : 'text-stone-900'}`}>{getProofDisplayName(proof)}</p>
          <p className={`mt-1 text-xs ${isSelected ? 'text-white/70' : 'text-stone-500'}`}>{getProofKindLabel(proof)}</p>
        </div>
      </div>
    </button>
  );
}

function QuestionNode({ item, depth, proofsById, selectedProofId, localDecisionMap, checkedQuestionIds, onToggleChecked, onSelectProof }) {
  const linkedProofs = parseIdsField(item.attached_proof_ids).map((proofId) => proofsById[proofId]).filter(Boolean);
  const isChecked = checkedQuestionIds.includes(item.id);

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-stone-200 pl-4' : ''}`}>
      <div className={`rounded-3xl border p-4 ${isChecked ? 'border-stone-300 bg-stone-100' : 'border-stone-200 bg-white shadow-sm'}`}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onToggleChecked(item.id)}
            className={`mt-0.5 h-6 w-6 flex-shrink-0 rounded-full border ${isChecked ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-transparent'}`}
          >
            ✓
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold leading-6 ${isChecked ? 'text-stone-500 line-through' : 'text-stone-900'}`}>{item.text || 'Untitled question'}</p>
            {item.expected_answer ? <p className="mt-2 text-xs text-stone-500">Expected: {item.expected_answer}</p> : null}
            {linkedProofs.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {linkedProofs.map((proof) => (
                  <LinkedProofChip
                    key={proof.id}
                    proof={proof}
                    isSelected={selectedProofId === proof.id}
                    localDecision={localDecisionMap[proof.id]}
                    onClick={() => onSelectProof(proof.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {item.children?.length > 0 ? (
        <div className="mt-3 space-y-3">
          {item.children.map((child) => (
            <QuestionNode
              key={child.id}
              item={child}
              depth={depth + 1}
              proofsById={proofsById}
              selectedProofId={selectedProofId}
              localDecisionMap={localDecisionMap}
              checkedQuestionIds={checkedQuestionIds}
              onToggleChecked={onToggleChecked}
              onSelectProof={onSelectProof}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AttorneyCentralQuestionsDrawer({
  open,
  onClose,
  parties = [],
  selectedExamPartyId,
  onSelectExamPartyId,
  selectedExamType,
  onSelectExamType,
  rootItems = [],
  selectedRootId,
  onSelectRootId,
  questionItems = [],
  proofsById = {},
  selectedProofId,
  localDecisionMap = {},
  checkedQuestionIds = [],
  onToggleChecked,
  onSelectProof,
}) {
  const questionTree = buildQuestionTree(questionItems, selectedRootId);

  return (
    <aside className={`absolute bottom-28 right-0 top-0 z-20 w-[min(30rem,calc(100vw-3rem))] border-l border-stone-200 bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex h-full flex-col">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Questions</p>
              <h2 className="mt-1 text-xl font-bold text-stone-900">Exam order</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-stone-200 bg-stone-50 p-2 text-stone-500 hover:text-stone-900">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={selectedExamPartyId} onChange={(event) => onSelectExamPartyId(event.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900 outline-none">
              {renderGroupedPartyOptions(parties)}
            </select>
            <select value={selectedExamType} onChange={(event) => onSelectExamType(event.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900 outline-none">
              <option value="Direct">Direct</option>
              <option value="Cross">Cross</option>
            </select>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {rootItems.map((item, index) => {
              const isActive = selectedRootId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectRootId(item.id)}
                  className={`min-w-[10rem] rounded-3xl border px-4 py-3 text-left transition ${isActive ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-300'}`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {index + 1}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{item.item_type === 'group' ? item.label : getProofDisplayName(proofsById[item.linked_proof_id])}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {questionTree.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
              Pick an exam group to see its questions here.
            </div>
          ) : (
            questionTree.map((item) => (
              <QuestionNode
                key={item.id}
                item={item}
                depth={0}
                proofsById={proofsById}
                selectedProofId={selectedProofId}
                localDecisionMap={localDecisionMap}
                checkedQuestionIds={checkedQuestionIds}
                onToggleChecked={onToggleChecked}
                onSelectProof={onSelectProof}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}