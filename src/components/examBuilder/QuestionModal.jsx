import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ProofPicker from './ProofPicker.jsx';

export default function QuestionModal({
  question,          // null = create, object = edit
  parentQuestion,    // set when creating a child question
  bucketId,
  partyId,
  examType,          // 'Direct' | 'Cross'
  onSubmit,
  onCancel,
  isLoading,
}) {
  const getProofIds = (value) => {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.ids)) return value.ids;
    return [];
  };

  const [text, setText] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [notes, setNotes] = useState('');
  const [proofIds, setProofIds] = useState([]);
  const [followUpGroup, setFollowUpGroup] = useState('');

  useEffect(() => {
    if (question) {
      setText(question.text || '');
      setExpectedAnswer(question.expected_answer || '');
      setNotes(question.notes || '');
      setProofIds(getProofIds(question.proof_ids));
      setFollowUpGroup(question.follow_up_group || parentQuestion?.follow_up_group || '');
    } else {
      setText('');
      setExpectedAnswer('');
      setNotes('');
      setProofIds([]);
      setFollowUpGroup(parentQuestion?.follow_up_group || '');
    }
  }, [question, parentQuestion]);

  const handleToggleProof = (proofId) => {
    setProofIds(prev =>
      prev.includes(proofId) ? prev.filter(id => id !== proofId) : [...prev, proofId]
    );
  };

  const isChild = !!parentQuestion || !!question?.parent_question_id;

  const handleSubmit = () => {
    if (!text.trim()) return;
    if (isChild && !followUpGroup) return;
    onSubmit({
      text: text.trim(),
      expected_answer: expectedAnswer.trim() || null,
      notes: notes.trim() || null,
      proof_ids: { ids: proofIds },
      type: examType,
      party_id: partyId,
      bucket_id: bucketId,
      block_type: 'Question',
      parent_question_id: parentQuestion?.id || question?.parent_question_id || null,
      follow_up_group: isChild ? followUpGroup : null,
    });
  };

  const parentLabel = parentQuestion?.text || 'Follow-up Question';
  const typeColor = examType === 'Direct'
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-red-100 text-red-700 border-red-200';

  return (
    <div className="space-y-5">
      {/* Context info */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${typeColor}`}>
          {examType} Examination
        </span>
        {isChild && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-semibold">
            Follow-up to: {parentLabel.length > 50 ? parentLabel.slice(0, 50) + '…' : parentLabel}
          </span>
        )}
      </div>

      {/* Question Text */}
      <div className="space-y-1.5">
        <Label htmlFor="qtext" className="text-sm font-medium text-slate-700">
          Question <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="qtext"
          placeholder="Type your question here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Expected Answer */}
      <div className="space-y-1.5">
        <Label htmlFor="qanswer" className="text-sm font-medium text-slate-700">
          Expected Answer <span className="text-slate-400">(optional)</span>
        </Label>
        <Textarea
          id="qanswer"
          placeholder="What answer are you expecting?"
          value={expectedAnswer}
          onChange={(e) => setExpectedAnswer(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="qnotes" className="text-sm font-medium text-slate-700">
          Notes <span className="text-slate-400">(optional)</span>
        </Label>
        <Input
          id="qnotes"
          placeholder="Internal notes / strategy…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {isChild && (
        <div className="space-y-1.5">
          <Label htmlFor="qgroup" className="text-sm font-medium text-slate-700">
            Follow-up Group <span className="text-red-500">*</span>
          </Label>
          <select
            id="qgroup"
            value={followUpGroup}
            onChange={(e) => setFollowUpGroup(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">Select group…</option>
            <option value="Forgot">Forgot</option>
            <option value="Deny">Deny</option>
          </select>
        </div>
      )}

      {/* Proof Picker */}
      <ProofPicker selectedProofIds={proofIds} onToggle={handleToggleProof} />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || (isChild && !followUpGroup) || isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Saving…' : question ? 'Save Changes' : 'Add Question'}
        </Button>
      </div>
    </div>
  );
}