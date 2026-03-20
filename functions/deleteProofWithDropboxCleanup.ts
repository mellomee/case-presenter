import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function getDropboxReference(proof) {
  if (proof.dropbox_path) return proof.dropbox_path;
  if (proof.dropbox_file_id) {
    return String(proof.dropbox_file_id).startsWith('id:') ? proof.dropbox_file_id : `id:${proof.dropbox_file_id}`;
  }
  return '';
}

async function deleteDropboxFile(accessToken, pathOrId) {
  if (!pathOrId) return { deleted: false, skipped: true };

  const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: pathOrId }),
  });

  const data = await response.json().catch(() => null);
  if (response.ok) {
    return { deleted: true, skipped: false };
  }

  const errorSummary = data?.error_summary || '';
  if (errorSummary.includes('not_found')) {
    return { deleted: false, skipped: true };
  }

  throw new Error(errorSummary || 'Failed to delete Dropbox file.');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = req.method === 'POST' ? await req.json() : {};
    const proofId = String(payload.proofId || '').trim();

    if (!proofId) {
      return Response.json({ error: 'proofId is required.' }, { status: 400 });
    }

    const proofs = await base44.entities.Proof.filter({ id: proofId });
    const proof = proofs[0];

    if (!proof) {
      return Response.json({ error: 'Proof not found.' }, { status: 404 });
    }

    const [childProofs, attachedQuestions] = await Promise.all([
      base44.entities.Proof.filter({ parent_proof_id: proof.id }),
      base44.entities.Question.filter({ proof_ids: proof.id }),
    ]);

    if (childProofs.length > 0) {
      return Response.json({ error: `This proof has ${childProofs.length} child proof${childProofs.length > 1 ? 's' : ''}. Delete all children first.` }, { status: 400 });
    }

    if (attachedQuestions.length > 0) {
      return Response.json({ error: `This proof is attached to ${attachedQuestions.length} question${attachedQuestions.length > 1 ? 's' : ''}. Remove from all questions first.` }, { status: 400 });
    }

    let dropboxCleanup = { deleted: false, skipped: true };

    if (proof.file_source === 'dropbox') {
      const reference = getDropboxReference(proof);
      if (reference) {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
        dropboxCleanup = await deleteDropboxFile(accessToken, reference);
      }
    }

    await base44.entities.Proof.delete(proof.id);

    return Response.json({
      success: true,
      proofId: proof.id,
      dropboxFileDeleted: dropboxCleanup.deleted,
      dropboxCleanupSkipped: dropboxCleanup.skipped,
    });
  } catch (error) {
    console.error('deleteProofWithDropboxCleanup failed', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});