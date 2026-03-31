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

    if (!targetProof) {
      return Response.json({ success: true, updatedCount: 0 });
    }

    let updatedCount = 0;

    const buildPatchFromParent = (parentProof, child) => {
      const patch = {};

      if (child.status !== parentProof.status) patch.status = parentProof.status;

      const fieldsToMirror = [
        'joint_exhibit_num',
        'joint_by',
        'joint_date',
        'admitted_exhibit_num',
        'admitted_by',
        'admit_date',
        'demonstrative_exhibit_num',
      ];

      for (const field of fieldsToMirror) {
        const parentValue = parentProof[field] || null;
        const childValue = child[field] || null;
        if (childValue !== parentValue) {
          patch[field] = parentValue;
        }
      }

      return patch;
    };

    const syncChildren = async (parentProof) => {
      const children = childrenByParent.get(parentProof.id) || [];

      for (const child of children) {
        const patch = buildPatchFromParent(parentProof, child);
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

    await syncChildren(targetProof);

    return Response.json({ success: true, updatedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});