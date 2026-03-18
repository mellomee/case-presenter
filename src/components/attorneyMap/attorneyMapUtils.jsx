function parseObjectValue(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function normalizeProofIds(proofIds) {
  if (!proofIds) return [];
  if (Array.isArray(proofIds)) return proofIds.filter(Boolean);

  if (typeof proofIds === 'string') {
    try {
      return normalizeProofIds(JSON.parse(proofIds));
    } catch {
      return proofIds.split(',').map((id) => id.trim()).filter(Boolean);
    }
  }

  if (typeof proofIds === 'object') {
    if (Array.isArray(proofIds.ids)) return proofIds.ids.filter(Boolean);
    return Object.entries(proofIds)
      .filter(([, value]) => value === true)
      .map(([key]) => key);
  }

  return [];
}

function uniqueById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function getRoleName(witness, roles = []) {
  return roles.find((role) => role.id === witness?.role_id)?.name || 'Witness';
}

export function getBucketStatus(bucketId, stateMap = {}) {
  return stateMap[`bucket:${bucketId}`]?.status || 'not_started';
}

export function getQuestionStatus(questionId, stateMap = {}) {
  return stateMap[`question:${questionId}`]?.status || 'not_started';
}

export function getBucketStatusMeta(status) {
  const lookup = {
    not_started: { label: 'Not Started', tone: 'slate' },
    active: { label: 'Active', tone: 'blue' },
    done: { label: 'Done', tone: 'green' },
    skipped: { label: 'Skipped', tone: 'amber' },
  };
  return lookup[status] || lookup.not_started;
}

export function getQuestionStatusMeta(status) {
  return status === 'asked'
    ? { label: 'Asked', tone: 'green' }
    : { label: 'Unasked', tone: 'slate' };
}

export function getProofStatusMeta(proof, publishedProofId) {
  if (proof?.status === 'Admitted') return { label: 'Admitted', tone: 'green' };
  if (proof?.status === 'Demonstrative') return { label: 'Demonstrative', tone: 'purple' };
  if (proof?.status === 'Joint') return { label: 'Joint', tone: 'blue' };
  if (proof?.status === 'Draft') return { label: 'Draft', tone: 'slate' };
  if (proof?.id && proof.id === publishedProofId) return { label: 'Published', tone: 'blue' };
  return { label: 'Unruled', tone: 'amber' };
}

function getTopLevelQuestions(bucketId, questions = []) {
  return questions
    .filter((question) => question.bucket_id === bucketId && !question.parent_question_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function getFollowUps(parentId, questions = []) {
  return questions
    .filter((question) => question.parent_question_id === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((question) => ({
      ...question,
      children: getFollowUps(question.id, questions),
    }));
}

function getAdmissionBlocks(bucketId, admissionBlocks = []) {
  return admissionBlocks
    .filter((block) => block.bucket_id === bucketId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function getLinkedProofs(question, proofs = []) {
  return normalizeProofIds(question?.proof_ids)
    .map((proofId) => proofs.find((proof) => proof.id === proofId))
    .filter(Boolean);
}

function normalizeBranchNodes(nodes = [], proofs = [], questions = [], branchKey = 'admitted', blockId = '') {
  return (Array.isArray(nodes) ? nodes : []).map((node, index) => ({
    id: `branch-${branchKey}-${blockId}-${index}`,
    text: node.text || `Question ${index + 1}`,
    expected_answer: node.expected_answer || '',
    notes: node.notes || '',
    linkedProofs: normalizeProofIds(node.proof_ids)
      .map((proofId) => proofs.find((proof) => proof.id === proofId))
      .filter(Boolean),
    children: normalizeBranchNodes(node.children || [], proofs, questions, branchKey, `${blockId}-${index}`),
    followUps: getFollowUps(node.id, questions),
  }));
}

export function buildOverviewMap({
  selectedSide,
  selectedWitness,
  roles = [],
  buckets = [],
  trialPoints = [],
  questions = [],
  admissionBlocks = [],
  proofs = [],
  stateMap = {},
  selectedNodeId = '',
}) {
  if (!selectedWitness) return { nodes: [], edges: [], metaMap: {}, searchItems: [], defaultNodeId: '' };

  const nodes = [];
  const edges = [];
  const metaMap = {};
  const searchItems = [];
  const roleName = getRoleName(selectedWitness, roles);
  const witnessNodeId = `witness-${selectedWitness.id}`;
  const relevantBuckets = buckets.filter((bucket) => bucket.party_id === selectedWitness.id);
  const groupedTrialPoints = [...new Set(relevantBuckets.map((bucket) => bucket.trial_point_id || '__unassigned__'))]
    .map((trialPointId) => trialPointId === '__unassigned__'
      ? { id: '__unassigned__', name: 'Unassigned' }
      : trialPoints.find((trialPoint) => trialPoint.id === trialPointId))
    .filter(Boolean);

  nodes.push({
    id: witnessNodeId,
    type: 'mapNode',
    position: { x: 520, y: 20 },
    data: {
      variant: 'witness',
      kicker: 'Witness',
      title: `${selectedWitness.first_name} ${selectedWitness.last_name}`,
      subtitle: roleName,
      badges: [{ label: selectedSide, tone: selectedSide === 'Plaintiff' ? 'green' : selectedSide === 'Defense' ? 'red' : 'amber' }],
      selected: selectedNodeId === witnessNodeId,
    },
  });

  metaMap[witnessNodeId] = { type: 'witness', title: `${selectedWitness.first_name} ${selectedWitness.last_name}` };
  searchItems.push({ id: witnessNodeId, label: `${selectedWitness.first_name} ${selectedWitness.last_name}`, type: 'Witness' });

  groupedTrialPoints.forEach((trialPoint, trialPointIndex) => {
    const tpNodeId = `trial-point-${trialPoint.id}`;
    const trialPointBuckets = relevantBuckets
      .filter((bucket) => (bucket.trial_point_id || '__unassigned__') === trialPoint.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    nodes.push({
      id: tpNodeId,
      type: 'mapNode',
      position: { x: 170 + trialPointIndex * 340, y: 180 },
      data: {
        variant: 'trialPoint',
        kicker: 'Trial Point',
        title: trialPoint.name,
        metrics: [`${trialPointBuckets.length} buckets`],
        badges: [{ label: 'Bucket lane', tone: 'blue' }],
        selected: selectedNodeId === tpNodeId,
      },
    });

    edges.push({ id: `${witnessNodeId}-${tpNodeId}`, source: witnessNodeId, target: tpNodeId });
    metaMap[tpNodeId] = { type: 'trialPoint', title: trialPoint.name };
    searchItems.push({ id: tpNodeId, label: trialPoint.name, type: 'Trial Point' });

    trialPointBuckets.forEach((bucket, bucketIndex) => {
      const bucketNodeId = `overview-bucket-${bucket.id}`;
      const topLevelQuestions = getTopLevelQuestions(bucket.id, questions);
      const blocks = getAdmissionBlocks(bucket.id, admissionBlocks);
      const needsAdmissionCount = blocks.filter((block) => {
        const proof = proofs.find((item) => item.id === block.proof_id);
        return proof && !['Admitted', 'Demonstrative'].includes(proof.status);
      }).length;
      const bucketStatus = getBucketStatusMeta(getBucketStatus(bucket.id, stateMap));

      nodes.push({
        id: bucketNodeId,
        type: 'mapNode',
        position: { x: 80 + trialPointIndex * 340 + bucketIndex * 250, y: 390 },
        data: {
          variant: 'bucket',
          kicker: 'Bucket',
          title: bucket.name,
          subtitle: bucket.exam_type,
          metrics: [`${topLevelQuestions.length} question sets`, `${blocks.length} proof gates`],
          badges: [
            bucketStatus,
            { label: needsAdmissionCount ? `${needsAdmissionCount} need rulings` : 'No pending proof rulings', tone: needsAdmissionCount ? 'amber' : 'green' },
          ],
          selected: selectedNodeId === bucketNodeId,
        },
      });

      edges.push({ id: `${tpNodeId}-${bucketNodeId}`, source: tpNodeId, target: bucketNodeId });
      metaMap[bucketNodeId] = {
        type: 'bucket',
        bucket,
        trialPoint,
        status: bucketStatus,
        questionCount: topLevelQuestions.length,
        admissionCount: blocks.length,
        needsAdmissionCount,
      };
      searchItems.push({ id: bucketNodeId, label: bucket.name, type: 'Bucket', bucketId: bucket.id });
    });
  });

  return {
    nodes: uniqueById(nodes),
    edges: uniqueById(edges),
    metaMap,
    searchItems: uniqueById(searchItems),
    defaultNodeId: witnessNodeId,
  };
}

export function buildBucketMap({
  bucket,
  trialPoint,
  questions = [],
  admissionBlocks = [],
  proofs = [],
  stateMap = {},
  selectedNodeId = '',
  publishedProofId = null,
}) {
  if (!bucket) return { nodes: [], edges: [], metaMap: {}, searchItems: [], defaultNodeId: '', nextNodeIdMap: {}, branchStartIds: {} };

  const nodes = [];
  const edges = [];
  const metaMap = {};
  const searchItems = [];
  const nextNodeIdMap = {};
  const branchStartIds = {};
  const headerNodeId = `bucket-summary-${bucket.id}`;
  const topLevelQuestions = getTopLevelQuestions(bucket.id, questions);
  const blocks = getAdmissionBlocks(bucket.id, admissionBlocks);
  const sequence = [
    ...topLevelQuestions.map((question) => ({ kind: 'question', sort: question.sort_order || 0, record: question })),
    ...blocks.map((block) => ({ kind: 'admissionBlock', sort: block.sort_order || 0, record: block })),
  ].sort((a, b) => a.sort - b.sort);

  nodes.push({
    id: headerNodeId,
    type: 'mapNode',
    position: { x: 330, y: 20 },
    data: {
      variant: 'bucket',
      kicker: 'Bucket Map',
      title: bucket.name,
      subtitle: trialPoint?.name || 'Unassigned Trial Point',
      metrics: [`${topLevelQuestions.length} question sets`, `${blocks.length} proof gates`],
      badges: [{ label: bucket.exam_type, tone: bucket.exam_type === 'Direct' ? 'green' : 'red' }],
      selected: selectedNodeId === headerNodeId,
    },
  });

  metaMap[headerNodeId] = { type: 'bucketSummary', title: bucket.name };
  searchItems.push({ id: headerNodeId, label: bucket.name, type: 'Bucket' });

  sequence.forEach((item, index) => {
    const currentId = item.kind === 'question' ? `question-${item.record.id}` : `admission-${item.record.id}`;
    const nextItem = sequence[index + 1];
    const nextId = nextItem ? (nextItem.kind === 'question' ? `question-${nextItem.record.id}` : `admission-${nextItem.record.id}`) : null;
    nextNodeIdMap[currentId] = nextId;

    const position = { x: 330, y: 180 + index * 230 };
    edges.push({ id: `${index === 0 ? headerNodeId : (sequence[index - 1].kind === 'question' ? `question-${sequence[index - 1].record.id}` : `admission-${sequence[index - 1].record.id}`)}-${currentId}`, source: index === 0 ? headerNodeId : (sequence[index - 1].kind === 'question' ? `question-${sequence[index - 1].record.id}` : `admission-${sequence[index - 1].record.id}`), target: currentId });

    if (item.kind === 'question') {
      const linkedProofs = getLinkedProofs(item.record, proofs);
      const status = getQuestionStatusMeta(getQuestionStatus(item.record.id, stateMap));

      nodes.push({
        id: currentId,
        type: 'mapNode',
        position,
        data: {
          variant: 'question',
          kicker: 'Question Set',
          title: item.record.text,
          metrics: linkedProofs.length ? [`${linkedProofs.length} linked proofs ready here`] : ['No linked proof on this set'],
          badges: [status, ...(linkedProofs.length ? [{ label: 'Uses proof', tone: 'blue' }] : [])],
          selected: selectedNodeId === currentId,
        },
      });

      metaMap[currentId] = {
        type: 'question',
        question: item.record,
        linkedProofs,
        followUps: getFollowUps(item.record.id, questions),
        status,
      };
      searchItems.push({ id: currentId, label: item.record.text, type: 'Question Set' });
      return;
    }

    const proof = proofs.find((candidate) => candidate.id === item.record.proof_id) || null;
    const proofStatus = getProofStatusMeta(proof, publishedProofId);
    const parsedPaths = parseObjectValue(item.record.path_question_sets, { admitted: [], not_admitted: [] }) || { admitted: [], not_admitted: [] };
    const admittedNodes = normalizeBranchNodes(parsedPaths.admitted || [], proofs, questions, 'admitted', item.record.id);
    const notAdmittedNodes = normalizeBranchNodes(parsedPaths.not_admitted || [], proofs, questions, 'not_admitted', item.record.id);

    nodes.push({
      id: currentId,
      type: 'mapNode',
      position,
      data: {
        variant: 'proofGate',
        kicker: 'Proof Gate',
        title: proof?.formal_name || proof?.name || 'Unlinked proof',
        subtitle: proof?.joint_exhibit_num || proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || 'Ruling required',
        metrics: [`${admittedNodes.length} admitted-route sets`, `${notAdmittedNodes.length} not-admitted sets`],
        badges: [proofStatus],
        selected: selectedNodeId === currentId,
      },
    });

    branchStartIds[item.record.id] = {
      admitted: admittedNodes[0]?.id || null,
      not_admitted: notAdmittedNodes[0]?.id || null,
    };

    metaMap[currentId] = {
      type: 'admissionBlock',
      block: item.record,
      proof,
      proofStatus,
      admittedCount: admittedNodes.length,
      notAdmittedCount: notAdmittedNodes.length,
      admittedPathStartId: admittedNodes[0]?.id || null,
      notAdmittedPathStartId: notAdmittedNodes[0]?.id || null,
      nextSequenceId: nextId,
    };
    searchItems.push({ id: currentId, label: proof?.formal_name || proof?.name || 'Proof Gate', type: 'Proof Gate' });

    admittedNodes.forEach((branchNode, branchIndex) => {
      const branchId = branchNode.id;
      const source = branchIndex === 0 ? currentId : admittedNodes[branchIndex - 1].id;
      const target = branchId;
      const branchNext = admittedNodes[branchIndex + 1]?.id || nextId;
      nextNodeIdMap[branchId] = branchNext || null;

      nodes.push({
        id: branchId,
        type: 'mapNode',
        position: { x: 660, y: position.y - ((admittedNodes.length - 1) * 60) + branchIndex * 120 },
        data: {
          variant: 'admittedPath',
          kicker: 'Admitted Route',
          title: branchNode.text,
          metrics: branchNode.linkedProofs.length ? [`${branchNode.linkedProofs.length} linked proofs`] : [],
          badges: [{ label: branchNode.children.length ? `${branchNode.children.length} child follow-ups` : 'No child follow-ups', tone: 'green' }],
          selected: selectedNodeId === branchId,
        },
      });

      edges.push({ id: `${source}-${target}`, source, target, style: { stroke: '#10b981', strokeWidth: 1.5 } });
      if (!admittedNodes[branchIndex + 1] && nextId) {
        edges.push({ id: `${target}-${nextId}`, source: target, target: nextId, style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '6 4' } });
      }

      metaMap[branchId] = {
        type: 'branchQuestion',
        question: {
          id: branchId,
          text: branchNode.text,
          expected_answer: branchNode.expected_answer,
          notes: branchNode.notes,
        },
        linkedProofs: branchNode.linkedProofs,
        followUps: branchNode.children,
        status: { label: 'Branch Set', tone: 'green' },
        branchLabel: 'Admitted Route',
        branchTone: 'green',
      };
      searchItems.push({ id: branchId, label: branchNode.text, type: 'Admitted Route' });
    });

    notAdmittedNodes.forEach((branchNode, branchIndex) => {
      const branchId = branchNode.id;
      const source = branchIndex === 0 ? currentId : notAdmittedNodes[branchIndex - 1].id;
      const target = branchId;
      const branchNext = notAdmittedNodes[branchIndex + 1]?.id || nextId;
      nextNodeIdMap[branchId] = branchNext || null;

      nodes.push({
        id: branchId,
        type: 'mapNode',
        position: { x: 0, y: position.y - ((notAdmittedNodes.length - 1) * 60) + branchIndex * 120 },
        data: {
          variant: 'notAdmittedPath',
          kicker: 'Not Admitted Route',
          title: branchNode.text,
          metrics: branchNode.linkedProofs.length ? [`${branchNode.linkedProofs.length} linked proofs`] : [],
          badges: [{ label: branchNode.children.length ? `${branchNode.children.length} child follow-ups` : 'No child follow-ups', tone: 'red' }],
          selected: selectedNodeId === branchId,
        },
      });

      edges.push({ id: `${source}-${target}`, source, target, style: { stroke: '#f43f5e', strokeWidth: 1.5 } });
      if (!notAdmittedNodes[branchIndex + 1] && nextId) {
        edges.push({ id: `${target}-${nextId}`, source: target, target: nextId, style: { stroke: '#f43f5e', strokeWidth: 1.5, strokeDasharray: '6 4' } });
      }

      metaMap[branchId] = {
        type: 'branchQuestion',
        question: {
          id: branchId,
          text: branchNode.text,
          expected_answer: branchNode.expected_answer,
          notes: branchNode.notes,
        },
        linkedProofs: branchNode.linkedProofs,
        followUps: branchNode.children,
        status: { label: 'Branch Set', tone: 'red' },
        branchLabel: 'Not Admitted Route',
        branchTone: 'red',
      };
      searchItems.push({ id: branchId, label: branchNode.text, type: 'Not Admitted Route' });
    });
  });

  return {
    nodes: uniqueById(nodes),
    edges: uniqueById(edges),
    metaMap,
    searchItems: uniqueById(searchItems),
    defaultNodeId: headerNodeId,
    nextNodeIdMap,
    branchStartIds,
  };
}