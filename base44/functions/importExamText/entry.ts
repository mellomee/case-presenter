import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function cleanLine(line) {
  return String(line || '').replace(/\r/g, '').trim();
}

function parseExpectedAnswer(line) {
  return cleanLine(line.replace(/^[-–—>\s]*→?\s*/, '')).replace(/^\((.*)\)$/, '$1').trim();
}

function parseBucketLabel(line) {
  const cleaned = cleanLine(line);
  const match = cleaned.match(/^(?:[^A-Za-z0-9]*\s*)?BUCKET\s+\d+\s*[—\-:]\s*(.+)$/i);
  if (!match) return null;
  return cleanLine(match[1].replace(/\s*\((?:\d+\s*[–\-]\s*\d+|\d+)\)\s*$/, ''));
}

function parseText(rawText) {
  const lines = String(rawText || '')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);

  const buckets = [];
  let currentBucket = null;

  for (const line of lines) {
    const bucketLabel = parseBucketLabel(line);
    if (bucketLabel) {
      if (currentBucket && currentBucket.questions.length > 0) {
        buckets.push(currentBucket);
      }
      currentBucket = { name: bucketLabel, questions: [] };
      continue;
    }

    if (!currentBucket) {
      continue;
    }

    if (line.startsWith('→') || line.startsWith('->')) {
      const lastQuestion = currentBucket.questions[currentBucket.questions.length - 1];
      if (lastQuestion) {
        lastQuestion.expected_answer = parseExpectedAnswer(line);
      }
      continue;
    }

    currentBucket.questions.push({ text: line, expected_answer: '' });
  }

  if (currentBucket && currentBucket.questions.length > 0) {
    buckets.push(currentBucket);
  }

  return buckets;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const partyId = cleanLine(body.partyId);
    const examType = cleanLine(body.examType);
    const rawText = String(body.rawText || '');

    if (!partyId) {
      return Response.json({ error: 'Party is required' }, { status: 400 });
    }

    if (!['Direct', 'Cross'].includes(examType)) {
      return Response.json({ error: 'Exam type must be Direct or Cross' }, { status: 400 });
    }

    if (!rawText.trim()) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const parties = await base44.entities.Party.list();
    const party = parties.find((item) => item.id === partyId);
    if (!party) {
      return Response.json({ error: 'Selected party was not found' }, { status: 404 });
    }

    const parsedBuckets = parseText(rawText);
    if (parsedBuckets.length === 0) {
      return Response.json({ error: 'No buckets were found. Start each section with a BUCKET heading.' }, { status: 400 });
    }

    const existingBuckets = await base44.entities.Bucket.filter({ party_id: partyId, exam_type: examType });
    let nextBucketSort = existingBuckets.reduce((max, bucket) => Math.max(max, Number(bucket.sort_order) || 0), 0) + 1;
    let totalQuestions = 0;
    const createdBuckets = [];

    for (const parsedBucket of parsedBuckets) {
      const createdBucket = await base44.entities.Bucket.create({
        name: parsedBucket.name,
        party_id: partyId,
        exam_type: examType,
        sort_order: nextBucketSort,
      });

      nextBucketSort += 1;
      createdBuckets.push({ id: createdBucket.id, name: createdBucket.name });

      const questions = parsedBucket.questions.map((question, index) => ({
        text: question.text,
        expected_answer: question.expected_answer || null,
        type: examType,
        party_id: partyId,
        bucket_id: createdBucket.id,
        block_type: 'Question',
        sort_order: index + 1,
      }));

      if (questions.length > 0) {
        await base44.entities.Question.bulkCreate(questions);
        totalQuestions += questions.length;
      }
    }

    return Response.json({
      success: true,
      bucketCount: createdBuckets.length,
      questionCount: totalQuestions,
      buckets: createdBuckets,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});