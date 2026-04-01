import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Search, X } from 'lucide-react';
import ExamBuilderProofThumb from '@/components/examV2/ExamBuilderProofThumb.jsx';
import ExamBuilderSafePreviewDialog from '@/components/examV2/ExamBuilderSafePreviewDialog.jsx';
import { getProofDisplayName } from '@/lib/examV2Utils';

const PARTY_SIDE_ORDER = ['Plaintiff', 'Defense', 'Neutral'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function comparePartiesByFirstName(a, b) {
  const firstComparison = String(a?.first_name || '').localeCompare(String(b?.first_name || ''), undefined, { sensitivity: 'base' });
  if (firstComparison !== 0) return firstComparison;
  return String(a?.last_name || '').localeCompare(String(b?.last_name || ''), undefined, { sensitivity: 'base' });
}

function renderGroupedPartyOptions(parties = [], { allLabel = null } = {}) {
  const groups = PARTY_SIDE_ORDER
    .map((side) => ({
      side,
      items: [...parties].filter((party) => party.side === side).sort(comparePartiesByFirstName),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {allLabel ? <option value="all">{allLabel}</option> : null}
      {groups.map((group, index) => (
        <React.Fragment key={group.side}>
          {index > 0 ? <option disabled>──────────</option> : null}
          <option disabled>{group.side}</option>
          {group.items.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
        </React.Fragment>
      ))}
    </>
  );
}

function getProofPartyIds(proof) {
  const partyIds = Array.isArray(proof?.party_ids)
    ? proof.party_ids
    : Array.isArray(proof?.party_ids?.ids)
      ? proof.party_ids.ids
      : [];

  return [...new Set([proof?.party_id, ...partyIds].filter(Boolean))];
}

function getProofTypeLabel(proof) {
  if (proof.proof_child_type === 'ExtractClip') return 'Extract Clip';
  if (proof.proof_child_type === 'VideoClip') return 'Video Clip';
  if (proof.proof_child_type === 'Extract') return 'Extract';
  if (proof.file_type === 'Video') return 'Video';
  if (proof.file_type === 'Image') return 'Image';
  return 'PDF';
}

function isHiddenDepositionSource(proof) {
  return proof?.proof_category === 'Deposition' && proof?.file_type === 'PDF' && !proof?.parent_proof_id && !proof?.proof_child_type;
}

function getParentProofCategory(proof, proofById) {
  return proof?.parent_proof_id ? proofById[proof.parent_proof_id]?.proof_category : null;
}

export default function QuestionEditorDialog({ open, onOpenChange, onSave, initialValue = null, availableProofs = [], parties = [], title = 'Question' }) {
  const [form, setForm] = useState({ text: '', expected_answer: '', notes: '', attached_proof_ids: [] });
  const [previewProof, setPreviewProof] = useState(null);
  const [proofTab, setProofTab] = useState('Exhibit');
  const [searchQuery, setSearchQuery] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');

  useEffect(() => {
    setForm({
      text: initialValue?.text || '',
      expected_answer: initialValue?.expected_answer || '',
      notes: initialValue?.notes || '',
      attached_proof_ids: initialValue?.attached_proof_ids || [],
    });
    setPreviewProof(null);
    setProofTab('Exhibit');
    setSearchQuery('');
    setPartyFilter('all');
  }, [initialValue, open]);

  const proofById = useMemo(
    () => Object.fromEntries(availableProofs.map((proof) => [proof.id, proof])),
    [availableProofs]
  );

  const toggleProof = (proofId) => {
    setForm((prev) => ({
      ...prev,
      attached_proof_ids: prev.attached_proof_ids.includes(proofId)
        ? prev.attached_proof_ids.filter((id) => id !== proofId)
        : [...prev.attached_proof_ids, proofId],
    }));
  };

  const removeAttachedProof = (proofId) => {
    setForm((prev) => ({
      ...prev,
      attached_proof_ids: prev.attached_proof_ids.filter((id) => id !== proofId),
    }));
  };

  const visibleProofTree = useMemo(() => {
    const matchingProofs = availableProofs.filter((proof) => {
      const parentCategory = getParentProofCategory(proof, proofById);

      if (proofTab === 'Exhibit') {
        const isAllowedExhibit = proof.proof_category === 'Exhibit' && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status);
        const isAllowedExhibitChild = parentCategory === 'Exhibit';
        if (!isAllowedExhibit && !isAllowedExhibitChild) {
          return false;
        }
      } else {
        const isDepositionBranch = proof.proof_category === 'Deposition' || parentCategory === 'Deposition';
        if (!isDepositionBranch || isHiddenDepositionSource(proof)) {
          return false;
        }
      }

      if (partyFilter !== 'all' && !getProofPartyIds(proof).includes(partyFilter)) {
        return false;
      }

      const searchTerm = normalize(searchQuery);
      if (!searchTerm) return true;

      const searchValues = [
        proof.name,
        proof.formal_name,
        proof.joint_exhibit_num,
        proof.admitted_exhibit_num,
        proof.demonstrative_exhibit_num,
        getProofTypeLabel(proof),
        ...getProofPartyIds(proof).map((partyId) => {
          const party = parties.find((item) => item.id === partyId);
          return party ? `${party.first_name} ${party.last_name}` : '';
        }),
      ];

      return searchValues.some((value) => normalize(value).includes(searchTerm));
    });

    const visibleIds = new Set();
    matchingProofs.forEach((proof) => {
      let currentProof = proof;
      while (currentProof) {
        if (!(proofTab === 'Deposition' && isHiddenDepositionSource(currentProof))) {
          visibleIds.add(currentProof.id);
        }
        currentProof = currentProof.parent_proof_id ? proofById[currentProof.parent_proof_id] : null;
      }
    });

    const roots = availableProofs.filter((proof) => visibleIds.has(proof.id) && (!proof.parent_proof_id || !visibleIds.has(proof.parent_proof_id)));
    const childrenByParent = new Map();

    availableProofs.forEach((proof) => {
      if (!visibleIds.has(proof.id) || !proof.parent_proof_id || !visibleIds.has(proof.parent_proof_id)) return;
      if (!childrenByParent.has(proof.parent_proof_id)) {
        childrenByParent.set(proof.parent_proof_id, []);
      }
      childrenByParent.get(proof.parent_proof_id).push(proof);
    });

    childrenByParent.forEach((items) => {
      items.sort((a, b) => String(getProofDisplayName(a)).localeCompare(String(getProofDisplayName(b)), undefined, { sensitivity: 'base' }));
    });

    roots.sort((a, b) => String(getProofDisplayName(a)).localeCompare(String(getProofDisplayName(b)), undefined, { sensitivity: 'base' }));

    return { roots, childrenByParent };
  }, [availableProofs, parties, partyFilter, proofById, proofTab, searchQuery]);

  const renderProofRow = (proof, depth = 0) => {
    const children = visibleProofTree.childrenByParent.get(proof.id) || [];
    const isAttached = form.attached_proof_ids.includes(proof.id);
    const isSelectable = proofTab === 'Exhibit' ? true : !isHiddenDepositionSource(proof);
    const partyNames = getProofPartyIds(proof)
      .map((partyId) => parties.find((party) => party.id === partyId))
      .filter(Boolean)
      .map((party) => `${party.first_name} ${party.last_name}`);

    return (
      <div key={proof.id} className="space-y-2" style={{ marginLeft: `${depth * 18}px` }}>
        <div
          onClick={() => isSelectable && toggleProof(proof.id)}
          className={`rounded-xl border p-3 ${isSelectable ? 'cursor-pointer' : 'cursor-default'} ${isAttached ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <ExamBuilderProofThumb proof={proof} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-sm font-semibold text-slate-900">{getProofDisplayName(proof)}</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">{getProofTypeLabel(proof)}</span>
                {proof.proof_category === 'Exhibit' && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">{proof.status}</span>}
                {!isSelectable && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">Source only</span>}
              </div>
              {partyNames.length > 0 && <p className="mt-1 text-[11px] text-slate-500">{partyNames.join(' · ')}</p>}
              {proof.parent_proof_id && proofById[proof.parent_proof_id] && (
                <p className="mt-1 text-[11px] text-slate-400">Child of {getProofDisplayName(proofById[proof.parent_proof_id])}</p>
              )}
              <p className={`mt-2 text-[11px] font-medium ${isAttached ? 'text-blue-700' : 'text-slate-500'}`}>
                {isAttached ? 'Attached' : isSelectable ? 'Click to attach' : 'Shown for relationship context'}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewProof(proof);
              }}
              className={`h-8 w-8 rounded-full border flex items-center justify-center ${previewProof?.id === proof.id ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              title="Preview proof"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {children.map((child) => renderProofRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-slate-200 bg-white text-slate-900 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-slate-600">Build parent or follow-up questions and attach inline proof references.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            value={form.text}
            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
            placeholder="Question text"
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
          />
          <input
            value={form.expected_answer}
            onChange={(event) => setForm((prev) => ({ ...prev, expected_answer: event.target.value }))}
            placeholder="Expected answer"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
          />
          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
          />

          {availableProofs.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Inline proof references</p>
                {form.attached_proof_ids.length > 0 && <p className="text-xs text-slate-500">Click an attached proof chip to remove it.</p>}
              </div>

              {form.attached_proof_ids.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {form.attached_proof_ids.map((proofId) => {
                    const attachedProof = proofById[proofId];
                    if (!attachedProof) return null;

                    return (
                      <button
                        key={proofId}
                        type="button"
                        onClick={() => removeAttachedProof(proofId)}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        title="Remove attached proof"
                      >
                        <span className="max-w-[14rem] truncate">{getProofDisplayName(attachedProof)}</span>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mb-4 flex flex-wrap items-center gap-2">
                {['Exhibit', 'Deposition'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProofTab(value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${proofTab === value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    {value}s
                  </button>
                ))}
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search internal name, type, exhibit #, or party"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500"
                  />
                </div>
                <select
                  value={partyFilter}
                  onChange={(event) => setPartyFilter(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  {renderGroupedPartyOptions(parties, { allLabel: 'All Parties' })}
                </select>
              </div>

              <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                {visibleProofTree.roots.length > 0 ? visibleProofTree.roots.map((proof) => renderProofRow(proof)) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No proofs match this view.
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={async () => { await onSave(form); onOpenChange(false); }}>Save Question</Button>
          </div>
        </div>
        <ExamBuilderSafePreviewDialog open={!!previewProof} onOpenChange={(nextOpen) => !nextOpen && setPreviewProof(null)} proof={previewProof} allProofs={availableProofs} />
      </DialogContent>
    </Dialog>
  );
}