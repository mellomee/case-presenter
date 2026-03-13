import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, Save } from 'lucide-react';

const STEPS = ['1', '2', '3', '3.1', '3.2', '3.3', '3.4', '3.5', '4', '5'];
const STEP_LABELS = {
  '1': 'Mark',
  '2': 'Request',
  '3': 'Authenticate',
  '3.1': 'Identification',
  '3.2': 'Description',
  '3.3': 'Authenticate',
  '3.4': 'Accuracy',
  '3.5': 'Helpfulness',
  '4': 'Move for Admission',
  '5': 'Publish',
};

const DEFAULT_TEMPLATES = {
  '1': 'I\'m showing you what has been marked as Exhibit {{exhibit_num}}. Do you recognize it?',
  '2': 'I\'d like to request Exhibit {{exhibit_num}} be shown to the jury.',
  '3.1': 'Can you identify what\'s depicted in this?',
  '3.2': 'Can you describe what you see?',
  '3.3': 'Did you create/take this?',
  '3.4': 'Does this fairly and accurately depict?',
  '3.5': 'Would this help the jury understand?',
  '4': 'Your Honor, I move for admission of Exhibit {{exhibit_num}} into evidence.',
  '5': 'Your Honor, may I publish Exhibit {{exhibit_num}} to the jury?',
};

export default function AdmissionTemplateTab() {
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState({});

  const { data: types = [] } = useQuery({
    queryKey: ['proofTypes'],
    queryFn: () => base44.entities.ProofTypeCategory.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', selectedTypeId],
    queryFn: () => (selectedTypeId ? base44.entities.AdmissionTemplate.filter({ proof_type_category_id: selectedTypeId }) : Promise.resolve([])),
    enabled: !!selectedTypeId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdmissionTemplate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AdmissionTemplate.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const handleTypeSelect = (typeId) => {
    setSelectedTypeId(typeId);
    setEditingTemplate({});
  };

  const handleReset = async () => {
    if (!selectedTypeId) return;
    for (const step of STEPS) {
      const existing = templates.find((t) => t.step === step);
      if (existing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          data: { default_text: DEFAULT_TEMPLATES[step] },
        });
      } else {
        await createMutation.mutateAsync({
          proof_type_category_id: selectedTypeId,
          step,
          default_text: DEFAULT_TEMPLATES[step],
        });
      }
    }
  };

  const handleSave = (stepId, text) => {
    const existing = templates.find((t) => t.step === stepId);
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: { default_text: text } });
    } else {
      createMutation.mutate({
        proof_type_category_id: selectedTypeId,
        step: stepId,
        default_text: text,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">Admission Templates</h3>
        {selectedTypeId && (
          <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset All to Defaults
          </Button>
        )}
      </div>

      {!selectedTypeId ? (
        <div className="grid grid-cols-2 gap-2">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className="p-3 text-left border border-slate-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition"
            >
              <p className="font-medium text-slate-900">{type.name}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Button onClick={() => setSelectedTypeId(null)} variant="outline" size="sm">
            ← Back to Types
          </Button>

          {STEPS.map((step) => {
            const template = templates.find((t) => t.step === step);
            const text = editingTemplate[step] ?? template?.default_text ?? DEFAULT_TEMPLATES[step];
            return (
              <div key={step} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-semibold text-slate-900">
                    Step {step}: {STEP_LABELS[step]}
                  </label>
                </div>
                <Textarea
                  value={text}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, [step]: e.target.value })}
                  className="mb-2 text-sm"
                  rows={3}
                  placeholder="Question text (use {{exhibit_num}} for auto-fill)"
                />
                <p className="text-xs text-slate-500 mb-2">Preview: {text.replace('{{exhibit_num}}', 'B-2')}</p>
                <Button
                  onClick={() => handleSave(step, text)}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="w-4 h-4" /> Save Step
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}