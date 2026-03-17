import React from 'react';
import { CheckCircle2, FileText, XCircle } from 'lucide-react';

function PathQuestionNode({ node, onSelectProof, depth = 0 }) {
  return (
    <div className={`${depth > 0 ? 'ml-4 pl-4 border-l border-slate-700' : ''}`}>
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 space-y-2">
        <p className="text-sm font-medium text-slate-100 leading-relaxed">{node.text}</p>

        {node.attachedParties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {node.attachedParties.map((party) => (
              <span key={party.id} className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {party.first_name} {party.last_name}
              </span>
            ))}
          </div>
        )}

        {node.attachedProofs?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {node.attachedProofs.map((proof) => (
              <button
                key={proof.id}
                onClick={() => onSelectProof(proof)}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700"
              >
                <FileText className="w-3 h-3 text-amber-400" />
                <span>{proof.formal_name || proof.name}</span>
              </button>
            ))}
          </div>
        )}

        {node.expected_answer && (
          <div className="rounded-lg bg-green-950/30 border border-green-900/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-green-400 mb-1">Expected Answer</p>
            <p className="text-sm text-slate-300 leading-relaxed">{node.expected_answer}</p>
          </div>
        )}

        {node.notes && (
          <div className="rounded-lg bg-amber-950/30 border border-amber-900/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">Notes</p>
            <p className="text-sm text-slate-300 leading-relaxed">{node.notes}</p>
          </div>
        )}
      </div>

      {node.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <PathQuestionNode
              key={child.id || child.text}
              node={child}
              onSelectProof={onSelectProof}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PathSection({ title, subtitle, tone, icon, questions, onSelectProof }) {
  const toneClasses = tone === 'success'
    ? 'border-green-900/50 bg-green-950/20 text-green-300'
    : 'border-red-900/50 bg-red-950/20 text-red-300';

  const Icon = icon;

  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5"><Icon className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-80 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-slate-400 bg-black/10">
          No branch questions attached yet.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <PathQuestionNode
              key={question.id || question.text}
              node={question}
              onSelectProof={onSelectProof}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdmissionBlockDetails({ blockProof, blockSteps = [], pathQuestionSets = {}, onSelectProof }) {
  const admittedQuestions = pathQuestionSets?.admitted || [];
  const notAdmittedQuestions = pathQuestionSets?.not_admitted || [];

  return (
    <div className="px-5 pb-4 space-y-4">
      {blockProof && (
        <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Attached Proof</p>
          <button
            onClick={() => onSelectProof(blockProof)}
            className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4" />
            {blockProof.formal_name || blockProof.name}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Admission Sequence</p>
        <div className="space-y-2">
          {blockSteps.map((step) => (
            <div
              key={step.key}
              className={`rounded-lg border p-3 ${step.sub ? 'ml-5 border-slate-700 bg-slate-950/40' : 'border-slate-700 bg-slate-900/80'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${step.sub ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-900'}`}>
                  {step.label}
                </span>
                <span className="text-xs text-slate-400">{step.title}</span>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">
                {step.text || 'No admission script set for this step yet.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Post-Ruling Paths</p>
        <PathSection
          title="Path 1 — If Admitted / Demonstrative"
          subtitle="Ask these after the court admits the proof as an exhibit or demonstrative."
          tone="success"
          icon={CheckCircle2}
          questions={admittedQuestions}
          onSelectProof={onSelectProof}
        />
        <PathSection
          title="Path 2 — If Not Admitted"
          subtitle="Use these if the court does not admit the proof and you need to pivot."
          tone="danger"
          icon={XCircle}
          questions={notAdmittedQuestions}
          onSelectProof={onSelectProof}
        />
      </div>
    </div>
  );
}