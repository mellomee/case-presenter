import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let payload = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const proofs = await base44.asServiceRole.entities.Proof.list();
    const childrenByParent = new Map();

    for (const proof of proofs) {
      if (!proof.parent_proof_id) continue;
      if (!childrenByParent.has(proof.parent_proof_id)) {
        childrenByParent.set(proof.parent_proof_id, []);
      }
      childrenByParent.get(proof.parent_proof_id).push(proof);
    }

    const proofById = new Map(proofs.map((proof) => [proof.id, proof]));
    const targetProofId = payload?.event?.entity_id || payload?.data?.id || null;
    const targetProof = targetProofId ? proofById.get(targetProofId) : null;

    const rootsToSync = targetProof
      ? [targetProof]
      : proofs.filter((proof) => proof.status === 'Admitted');

    let updatedCount = 0;

    const syncChildren = async (parentProof) => {
      const children = childrenByParent.get(parentProof.id) || [];

      for (const child of children) {
        const patch = {};

        if (parentProof.status === 'Admitted') {
          if (child.status !== 'Admitted') patch.status = 'Admitted';
          if (child.admitted_exhibit_num !== parentProof.admitted_exhibit_num) patch.admitted_exhibit_num = parentProof.admitted_exhibit_num || null;
          if (child.admitted_by !== parentProof.admitted_by) patch.admitted_by = parentProof.admitted_by || null;
          if (child.admit_date !== parentProof.admit_date) patch.admit_date = parentProof.admit_date || null;
        }

        const nextChild = Object.keys(patch).length > 0
          ? { ...child, ...patch }
          : child;

        if (Object.keys(patch).length > 0) {
          await base44.asServiceRole.entities.Proof.update(child.id, patch);
          updatedCount += 1;
        }

        await syncChildren(nextChild);
      }
    };

    for (const rootProof of rootsToSync) {
      if (rootProof?.status === 'Admitted') {
        await syncChildren(rootProof);
      }
    }

    return Response.json({ success: true, updatedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});