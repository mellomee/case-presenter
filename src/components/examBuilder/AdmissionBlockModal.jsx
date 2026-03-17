import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X, RotateCcw, Eye } from 'lucide-react';

const STEPS = [
  { key: '1',   label: 'Step 1',   title: 'Mark the Exhibit',          sub: false },
  { key: '2',   label: 'Step 2',   title: 'Request Witness Review',     sub: false },
  { key: '3',   label: 'Step 3',   title: 'Authenticate (Intro)',       sub: false },
  { key: '3.1', label: 'Step 3.1', title: 'Identification',             sub: true  },
  { key: '3.2', label: 'Step 3.2', title: 'Description',                sub: true  },
  { key: '3.3', label: 'Step 3.3', title: 'Authentication',             sub: true  },
  { key: '3.4', label: 'Step 3.4', title: 'Accuracy',                   sub: true  },
  { key: '3.5', label: 'Step 3.5', title: 'Helpfulness / Relevance',    sub: true  },
  { key: '4',   label: 'Step 4',   title: 'Move for Admission',         sub: false },
  { key: '5',   label: 'Step 5',   title: 'Publish to Jury',            sub: false },
];

function fillExhibitNum(text, exhibitNum) {
  return text.replace(/\{\{exhibit_num\}\}/g, exhibitNum || '[Exhibit #]');
}

function StepRow({ stepKey, label, title, sub, templateText, override, onSaveOverride, exhibitNum }) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');

  const activeText = override ?? templateText ?? '';
  const isOverridden = override !== null && override !== undefined;
  const hasTemplate = !!templateText;

  const preview = activeText ? fillExhibitNum(activeText, exhibitNum) : null;

  const startEdit = () => {
    setDraftText(activeText);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = draftText.trim();
    // Only save as override if different from template
    if (trimmed === templateText) {
      onSaveOverride(stepKey, null); // remove override, revert to template
    } else {
      onSaveOverride(stepKey, trimmed || null);
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const resetToTemplate = () => {
    onSaveOverride(stepKey, null);
    setEditing(false);
  };

  return (
    <div className={`rounded-lg border transition-all ${sub ? 'ml-5 border-slate-100 bg-slate-50/50' : 'border-slate-200 bg-white'} ${isOverridden ? 'ring-1 ring-amber-300' : ''}`}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sub ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-white'}`}>
              {label}
            </span>
            <span className={`text-xs font-medium ${sub ? 'text-slate-400' : 'text-slate-600'}`}>{title}</span>
            {isOverridden && (
              <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0">✏ Custom</Badge>
            )}
          </div>
          <div className="flex gap-1">
            {editing ? (
              <>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:bg-green-50" onClick={commitEdit} title="Save">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:bg-slate-100" onClick={cancelEdit} title="Cancel">
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={startEdit} title="Edit">
                  <Pencil className="w-3 h-3" />
                </Button>
                {isOverridden && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-amber-500 hover:text-amber-700 hover:bg-amber-50" onClick={resetToTemplate} title="Reset to template">
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {editing ? (
          <div className="space-y-1.5">
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={2}
              className="text-sm resize-none font-mono"
              autoFocus
              placeholder={hasTemplate ? `Template: ${templateText}` : 'Enter custom question text…'}
            />
            {/* Live preview inside edit */}
            {draftText && (
              <div className="flex items-start gap-1.5 bg-blue-50 rounded p-2">
                <Eye className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 italic leading-snug">
                  {fillExhibitNum(draftText, exhibitNum)}
                </p>
              </div>
            )}
            {hasTemplate && draftText !== templateText && (
              <p className="text-xs text-slate-400">
                Template: <span className="italic">{templateText}</span>
              </p>
            )}
          </div>
        ) : (
          <div>
            {preview ? (
              <p className="text-sm text-slate-800 leading-snug">{preview}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">No template — click ✏ to add custom text</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdmissionBlockModal({ block, bucketId, partyId, onSubmit, onCancel, isLoading }) {
  const [selectedProofId, setSelectedProofId] = useState('');
  const [proofTypeCategoryId, setProofTypeCategoryId] = useState('');
  const [stepOverrides, setStepOverrides] = useState({});

  const { data: proofs = [] } = useQuery({ queryKey: ['proofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: proofTypeCategories = [] } = useQuery({ queryKey: ['proofTypeCategories'], queryFn: () => base44.entities.ProofTypeCategory.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['admissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });

  const jointExhibits = proofs.filter(p =>
    p.proof_category === 'Exhibit' && ['Joint', 'Admitted', 'Demonstrative'].includes(p.status)
  );

  useEffect(() => {
    if (block) {
      setSelectedProofId(block.proof_id || '');
      setProofTypeCategoryId(block.proof_type_category_id || '');
      setStepOverrides(block.step_overrides || {});
    } else {
      setSelectedProofId('');
      setProofTypeCategoryId('');
      setStepOverrides({});
    }
  }, [block]);

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
      if (text === null || text === undefined) delete next[stepKey];
      else next[stepKey] = { text };
      return next;
    });
  };

  const resetAllToTemplate = () => {
    setStepOverrides({});
  };

  const overriddenCount = Object.keys(stepOverrides).length;

  const selectedProof = proofs.find(p => p.id === selectedProofId);
  const exhibitNum =
    selectedProof?.admitted_exhibit_num ||
    selectedProof?.demonstrative_exhibit_num ||
    selectedProof?.joint_exhibit_num ||
    '';

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
                      [{p.admitted_exhibit_num || p.joint_exhibit_num}]
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
      </div>

      {/* Exhibit # Preview Banner */}
      {selectedProof && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Selected Exhibit</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{selectedProof.formal_name || selectedProof.name}</p>
          </div>
          {exhibitNum ? (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-500">Exhibit #</p>
              <p className="text-sm font-bold font-mono text-blue-700">{exhibitNum}</p>
            </div>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 text-xs">No exhibit # yet</Badge>
          )}
        </div>
      )}

      {/* Admission Script */}
      {proofTypeCategoryId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Admission Script</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Click <Pencil className="w-3 h-3 inline" /> to customise a step. <code className="bg-slate-100 px-1 rounded text-xs">{'{{exhibit_num}}'}</code> is auto-replaced in preview.
              </p>
            </div>
            {overriddenCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetAllToTemplate}
                className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 h-7 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Reset All ({overriddenCount})
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {STEPS.map(step => (
              <StepRow
                key={step.key}
                stepKey={step.key}
                label={step.label}
                title={step.title}
                sub={step.sub}
                templateText={getTemplateText(step.key)}
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