import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw } from 'lucide-react';

const STEPS = [
  { id: '1', label: '1. Mark' },
  { id: '2', label: '2. Request' },
  { id: '3', label: '3. Authenticate' },
  { id: '3.1', label: '3.1 Identification' },
  { id: '3.2', label: '3.2 Description' },
  { id: '3.3', label: '3.3 Authenticate' },
  { id: '3.4', label: '3.4 Accuracy' },
  { id: '3.5', label: '3.5 Helpfulness' },
  { id: '4', label: '4. Move for Admission' },
  { id: '5', label: '5. Publish' },
];

const DEFAULT_TEMPLATES = {
  '1': 'I\'m showing you what has been marked as Exhibit {{exhibit_num}}. Do you recognize it?',
  '2': 'I\'d like to request Exhibit {{exhibit_num}} be shown to the jury.',
  '3': 'Let me ask you to authenticate this exhibit.',
  '3.1': 'Can you identify what\'s depicted?',
  '3.2': 'Can you describe what you see?',
  '3.3': 'Did you take this photograph?',
  '3.4': 'Does this fairly and accurately depict the scene?',
  '3.5': 'Would this help the jury understand your testimony?',
  '4': 'Your Honor, I move for the admission of Exhibit {{exhibit_num}} into evidence.',
  '5': 'Your Honor, may I publish Exhibit {{exhibit_num}} to the jury?',
};

export default function AdmissionTemplatesTab() {
  const queryClient = useQueryClient();
  const [proofTypeId, setProofTypeId] = useState(null);
  const [templates, setTemplates] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: proofTypes = [] } = useQuery({
    queryKey: ['proofTypeCategories'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const { data: admissionTemplates = [] } = useQuery({
    queryKey: ['admissionTemplates', proofTypeId],
    queryFn: () => base44.entities.AdmissionTemplate.filter({ proof_type_category_id: proofTypeId }),
    enabled: !!proofTypeId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const saveData = Object.entries(data).map(([step, text]) => ({
        proof_type_category_id: proofTypeId,
        step,
        default_text: text,
      }));

      for (const item of saveData) {
        const existing = admissionTemplates.find((t) => t.step === item.step);
        if (existing) {
          await base44.entities.AdmissionTemplate.update(existing.id, item);
        } else {
          await base44.entities.AdmissionTemplate.create(item);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissionTemplates'] });
      setHasChanges(false);
    },
  });

  const handleProofTypeSelect = (id) => {
    setProofTypeId(id);
    const templateMap = {};
    admissionTemplates.forEach((t) => {
      templateMap[t.step] = t.default_text;
    });
    STEPS.forEach((step) => {
      if (!templateMap[step.id]) {
        templateMap[step.id] = DEFAULT_TEMPLATES[step.id] || '';
      }
    });
    setTemplates(templateMap);
    setHasChanges(false);
  };

  const handleTemplateChange = (stepId, text) => {
    setTemplates({ ...templates, [stepId]: text });
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(templates);
  };

  const handleResetAll = () => {
    if (confirm('Reset all templates to factory defaults?')) {
      setTemplates(DEFAULT_TEMPLATES);
      setHasChanges(true);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Admission Templates</h3>
        <div className="flex gap-2">
          {hasChanges && (
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          )}
          <Button variant="outline" onClick={handleResetAll} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset All
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Proof Type Category</label>
        <div className="grid grid-cols-2 gap-2">
          {proofTypes.map((pt) => (
            <button
              key={pt.id}
              onClick={() => handleProofTypeSelect(pt.id)}
              className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                proofTypeId === pt.id
                  ? 'bg-blue-50 border-blue-600 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {pt.name}
            </button>
          ))}
        </div>
      </div>

      {proofTypeId && (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Edit the default question text for each step. Use <code className="bg-slate-100 px-2 py-1 rounded">{'{{exhibit_num}}'}</code> as a placeholder for the exhibit number.
          </p>

          {STEPS.map((step) => (
            <div key={step.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              <label className="block text-sm font-semibold text-slate-900 mb-3">{step.label}</label>
              <Textarea
                value={templates[step.id] || ''}
                onChange={(e) => handleTemplateChange(step.id, e.target.value)}
                placeholder={DEFAULT_TEMPLATES[step.id]}
                className="w-full min-h-24 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}