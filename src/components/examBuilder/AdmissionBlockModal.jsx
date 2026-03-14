import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X, ChevronRight } from 'lucide-react';

const STEPS = [
  { key: '1',   label: 'Step 1 — Mark the Exhibit',         sub: false },
  { key: '2',   label: 'Step 2 — Request Witness Review',   sub: false },
  { key: '3',   label: 'Step 3 — Authenticate (Intro)',     sub: false },
  { key: '3.1', label: 'Step 3.1 — Identification',         sub: true },
  { key: '3.2', label: 'Step 3.2 — Description',            sub: true },
  { key: '3.3', label: 'Step 3.3 — Authentication',         sub: true },
  { key: '3.4', label: 'Step 3.4 — Accuracy',               sub: true },
  { key: '3.5', label: 'Step 3.5 — Helpfulness / Relevance',sub: true },
  { key: '4',   label: 'Step 4 — Move for Admission',       sub: false },
  { key: '5',   label: 'Step 5 — Publish to Jury',          sub: false },
];

function StepRow({ stepKey, label, sub, resolvedText, override, onSaveOverride, exhibitNum }) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');

  const displayed = override || resolvedText || '';
  const isOverridden = !!override;

  const startEdit = () => {
    setDraftText(displayed);
    setEditing(true);
  };

  const commitEdit = () => {
    onSaveOverride(stepKey, draftText.trim() || null);
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const resetOverride = () => {
    onSaveOverride(stepKey, null);
    setEditing(false);
  };

  // Replace {{exhibit_num}} for preview
  const preview = displayed.replace('{{exhibit_num}}', exhibitNum || '[Exhibit #]');

  return (
    <div className={`rounded-lg border ${sub ? 'ml-6 border-slate-100 bg-slate-50/60' : 'border-slate-200 bg-white'} p-3`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold mb-1 ${sub ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
          {editing ? (
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              autoFocus
            />
          ) : (
            <p className={`text-sm leading-snug ${preview ? 'text-slate-800' : 'text-slate-400 italic'}`}>
              {preview || 'No template — click ✏️ to add custom text'}
            </p>
          )}
          {isOverridden && !editing && (
            <span className="text-xs text-amber-600 font-medium mt-1 inline-block">✏️ Customised</span>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0 mt-0.5">
          {editing ? (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={commitEdit}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={cancelEdit}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={startEdit}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {isOverridden && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-600 hover:bg-amber-50" onClick={resetOverride} title="Reset to template">
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdmissionBlockModal({ block, bucketId, partyId, onSubmit, onCancel, isLoading }) {
  const [selectedProofId, setSelectedProofId] = useState('');
  const [proofTypeCategoryId, setProofTypeCategoryId] = useState('');
  const [stepOverrides, setStepOverrides] = useState({});

  // Data
  const { data: proofs = [] } = useQuery({ queryKey: ['proofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: proofTypeCategories = [] } = useQuery({ queryKey: ['proofTypeCategories'], queryFn: () => base44.entities.ProofTypeCategory.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['admissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });

  // Joint exhibits only (top-level + children)
  const jointExhibits = proofs.filter(p =>
    p.proof_category === 'Exhibit' && (p.status === 'Joint' || p.status === 'Admitted' || p.status === 'Demonstrative')
  );

  // Populate on edit
  useEffect(() => {
    if (block) {
      setSelectedProofId(block.proof_id || '');
      setProofTypeCategoryId(block.proof_type_category_id || '');
      setStepOverrides(block.step_overrides || {});
    }
  }, [block]);

  // Auto-set proof type category from proof
  const handleSelectProof = (proofId) => {
    setSelectedProofId(proofId);
    const proof = proofs.find(p => p.id === proofId);
    if (proof?.proof_type_category_id && !proofTypeCategoryId) {
      setProofTypeCategoryId(proof.proof_type_category_id);
    }
  };

  const getTemplateText = (stepKey) => {
    if (!proofTypeCategoryId) return '';
    const tmpl = admissionTemplates.find(t => t.proof_type_category_id === proofTypeCategoryId && t.step === stepKey);
    return tmpl?.default_text || '';
  };

  const handleSaveOverride = (stepKey, text) => {
    setStepOverrides(prev => {
      const next = { ...prev };
      if (text === null) delete next[stepKey];
      else next[stepKey] = { text };
      return next;
    });
  };

  const selectedProof = proofs.find(p => p.id === selectedProofId);
  const exhibitNum = selectedProof?.joint_exhibit_num || selectedProof?.admitted_exhibit_num || selectedProof?.demonstrative_exhibit_num || '';

  const handleSubmit = () => {
    if (!selectedProofId || !proofTypeCategoryId) return;
    onSubmit({
      proof_id: selectedProofId,
      proof_type_category_id: proofTypeCategoryId,
      party_id: partyId,
      bucket_id: bucketId,
      step_overrides: stepOverrides,
      sort_order: block?.sort_order ?? 999,
    });
  };

  return (
    <div className="space-y-5">
      {/* Proof Selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">
          Proof to Admit <span className="text-red-500">*</span>
        </label>
        {jointExhibits.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No Joint, Admitted, or Demonstrative exhibits available.</p>
        ) : (
          <Select value={selectedProofId} onValueChange={handleSelectProof}>
            <SelectTrigger>
              <SelectValue placeholder="Select a proof…" />
            </SelectTrigger>
            <SelectContent>
              {jointExhibits.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="font-medium">{p.formal_name || p.name}</span>
                  {(p.joint_exhibit_num || p.admitted_exhibit_num) && (
                    <span className="ml-2 text-xs text-slate-400 font-mono">
                      [{p.joint_exhibit_num || p.admitted_exhibit_num}]
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Proof Type Category */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">
          Proof Type Category <span className="text-red-500">*</span>
        </label>
        <Select value={proofTypeCategoryId} onValueChange={setProofTypeCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Select proof type…" />
          </SelectTrigger>
          <SelectContent>
            {proofTypeCategories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {proofTypeCategoryId && (
          <p className="text-xs text-slate-500">Template questions loaded below. Click ✏️ on any step to customise.</p>
        )}
      </div>

      {/* Steps */}
      {proofTypeCategoryId && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Admission Script</p>
          <div className="space-y-2">
            {STEPS.map(step => (
              <StepRow
                key={step.key}
                stepKey={step.key}
                label={step.label}
                sub={step.sub}
                resolvedText={getTemplateText(step.key)}
                override={stepOverrides[step.key]?.text ?? null}
                onSaveOverride={handleSaveOverride}
                exhibitNum={exhibitNum}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedProofId || !proofTypeCategoryId || isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Saving…' : block ? 'Save Changes' : 'Add Admission Block'}
        </Button>
      </div>
    </div>
  );
}