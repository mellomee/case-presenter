import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const bucketIds = Array.isArray(body.bucketIds) ? body.bucketIds.filter(Boolean) : [];

    if (bucketIds.length === 0) {
      return Response.json({ error: 'bucketIds is required' }, { status: 400 });
    }

    let deletedQuestions = 0;
    let deletedBuckets = 0;

    for (const bucketId of bucketIds) {
      const questions = await base44.entities.Question.filter({ bucket_id: bucketId });
      for (const question of questions) {
        await base44.entities.Question.delete(question.id);
        deletedQuestions += 1;
      }

      await base44.entities.Bucket.delete(bucketId);
      deletedBuckets += 1;
    }

    return Response.json({ success: true, deletedBuckets, deletedQuestions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});