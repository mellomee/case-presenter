import React from 'react';
import { ExternalLink, FileText, Tv, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPartyTone, getProofDisplayName, getProofExhibitNumber, getProofStatusClasses, getProofStatusLabel } from './attorneyCentralUtils';

export default function AttorneyCentralActionBar({
  proof,
  party,
  juryPublished,
  witnessPublished,
  onPublishJury,
  onUnpublishJury,
  onPublishWitness,
  onUnpublishWitness,
  onAdmitExhibit,
  onAdmitDemo,
  onUnadmit,
}) {
  if (!proof) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
        Select a proof from Marked Exhibits to load it into Attorney Central.
      </div>
    );
  }

  const exhibitNumber = getProofExhibitNumber(proof);
  const canAdmit = proof.proof_category === 'Exhibit' && proof.status === 'Joint';
  const canUnadmit = proof.proof_category === 'Exhibit' && ['Admitted', 'Demonstrative'].includes(proof.status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`border ${getProofStatusClasses(proof)}`}>{getProofStatusLabel(proof)}</Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-700">{proof.file_type}</Badge>
            {exhibitNumber ? <Badge variant="outline" className="border-slate-200 text-slate-700">{exhibitNumber}</Badge> : null}
            {party ? <Badge className={`border ${getPartyTone(party.side)}`}><Users className="mr-1 h-3 w-3" />{party.first_name} {party.last_name}</Badge> : null}
          </div>
          <h1 className="mt-3 truncate text-2xl font-bold text-slate-900">{getProofDisplayName(proof)}</h1>
          <p className="mt-1 text-sm text-slate-600">Fast access to preview, publish, and exam-linked questions without leaving the trial screen.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {canAdmit ? (
            <>
              <Button type="button" onClick={onAdmitExhibit} className="min-h-[44px] bg-green-600 hover:bg-green-700">
                <FileText className="h-4 w-4" />
                Admit Exhibit
              </Button>
              <Button type="button" onClick={onAdmitDemo} className="min-h-[44px] bg-purple-600 hover:bg-purple-700">
                <Tv className="h-4 w-4" />
                Admit Demo
              </Button>
            </>
          ) : null}

          {canUnadmit ? (
            <Button type="button" variant="outline" onClick={onUnadmit} className="min-h-[44px] border-slate-300 text-slate-700">
              Un-Admit
            </Button>
          ) : null}

          {witnessPublished ? (
            <Button type="button" onClick={onUnpublishWitness} className="min-h-[44px] bg-red-600 hover:bg-red-700">
              <ExternalLink className="h-4 w-4" />
              Unpublish Witness
            </Button>
          ) : (
            <Button type="button" onClick={onPublishWitness} className="min-h-[44px] bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="h-4 w-4" />
              Publish Witness
            </Button>
          )}

          {juryPublished ? (
            <Button type="button" onClick={onUnpublishJury} className="min-h-[44px] bg-red-600 hover:bg-red-700">
              <Tv className="h-4 w-4" />
              Unpublish Jury
            </Button>
          ) : (
            <Button type="button" onClick={onPublishJury} className="min-h-[44px] bg-blue-600 hover:bg-blue-700">
              <Tv className="h-4 w-4" />
              Publish Jury
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}