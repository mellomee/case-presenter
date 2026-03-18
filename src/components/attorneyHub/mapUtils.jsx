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

    const entries = Object.entries(proofIds);
    if (entries.every(([, value]) => typeof value === 'boolean')) {
      return entries.filter(([, value]) => value).map(([key]) => key);
    }

    return Object.values(proofIds).filter((value) => typeof value === 'string' && value);
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

function shortText(text = '', max = 52) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function getRoleName(witness, roles = []) {
  return roles.find((role) => role.id === witness?.role_id)?.name || 'Witness';
}

export function getTopLevelQuestions(bucketId, questions = []) {
  return questions
    .filter((question) => question.bucket_id === bucketId && !question.parent_question_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function getFollowUpQuestions(parentId, questions = []) {
  return questions
    .filter((question) => question.parent_question_id === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((question) => ({
      ...question,
      children: getFollowUpQuestions(question.id, questions),
    }));
}

export function getBucketAdmissionBlocks(bucketId, admissionBlocks = []) {
  return admissionBlocks
    .filter((block) => block.bucket_id === bucketId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function getQuestionLinkedProofs(question, proofs = []) {
  const proofIds = normalizeProofIds(question?.proof_ids);
  return proofIds.map((proofId) => proofs.find((proof) => proof.id === proofId)).filter(Boolean);
}

export function getBucketLinkedProofs(bucketId, questions = [], admissionBlocks = [], proofs = []) {
  const questionProofs = questions
    .filter((question) => question.bucket_id === bucketId)
    .flatMap((question) => getQuestionLinkedProofs(question, proofs));

  const blockProofs = getBucketAdmissionBlocks(bucketId, admissionBlocks)
    .map((block) => proofs.find((proof) => proof.id === block.proof_id))
    .filter(Boolean);

  return uniqueById([...questionProofs, ...blockProofs]);
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

export function getProofAdmissionMeta(proof) {
  if (proof?.status === 'Admitted') return { label: 'Admitted as Exhibit', tone: 'green' };
  if (proof?.status === 'Demonstrative') return { label: 'Demonstrative Only', tone: 'purple' };
  return { label: 'Not Admitted', tone: 'slate' };
}

export function getProofPublishedMeta(proofId, publishedProofId) {
  return proofId && publishedProofId === proofId
    ? { label: 'Published', tone: 'blue' }
    : { label: 'Not Published', tone: 'slate' };
}

export function bucketNeedsAdmission(bucketId, admissionBlocks = [], proofs = []) {
  return getBucketAdmissionBlocks(bucketId, admissionBlocks).some((block) => {
    const proof = proofs.find((item) => item.id === block.proof_id);
    return proof && !['Admitted', 'Demonstrative'].includes(proof.status);
  });
}

function buildTreeItems({ selectedSide, selectedWitness, groupedTrialPoints, bucketMetaById }) {
  if (!selectedWitness) return [];

  return [{
    id: `side-${selectedSide}`,
    type: 'side',
    label: selectedSide,
    children: [{
      id: `witness-${selectedWitness.id}`,
      type: 'witness',
      nodeId: `witness-${selectedWitness.id}`,
      label: `${selectedWitness.first_name} ${selectedWitness.last_name}`,
      children: groupedTrialPoints.map((trialPoint) => ({
        id: `tree-tp-${trialPoint.id}`,
        type: 'trialPoint',
        nodeId: `trialPoint-${trialPoint.id}`,
        label: trialPoint.name,
        children: trialPoint.buckets.map((bucket) => ({
          id: `tree-bucket-${bucket.id}`,
          type: 'bucket',
          nodeId: `bucket-${bucket.id}`,
          label: bucket.name,
          badges: bucketMetaById[bucket.id]?.sidebarBadges || [],
        })),
      })),
    }],
  }];
}

export function buildMapData({
  selectedSide,
  selectedWitness,
  roles = [],
  buckets = [],
  trialPoints = [],
  questions = [],
  admissionBlocks = [],
  proofs = [],
  stateMap = {},
  positionsMap = {},
  expandedBucketId = null,
  compactView = true,
  publishedProofId = null,
  selectedNodeId = null,
}) {
  if (!selectedWitness) {
    return { nodes: [], edges: [], metaMap: {}, treeItems: [], searchItems: [] };
  }

  const roleName = getRoleName(selectedWitness, roles);
  const relevantBuckets = buckets
    .filter((bucket) => bucket.party_id === selectedWitness.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const groupedTrialPoints = [];
  const trialPointIds = new Set(relevantBuckets.map((bucket) => bucket.trial_point_id || '__unassigned__'));

  [...trialPoints.filter((trialPoint) => trialPointIds.has(trialPoint.id)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), ...(trialPointIds.has('__unassigned__') ? [{ id: '__unassigned__', name: 'Unassigned' }] : [])]
    .forEach((trialPoint) => {
      groupedTrialPoints.push({
        ...trialPoint,
        buckets: relevantBuckets.filter((bucket) => (bucket.trial_point_id || '__unassigned__') === trialPoint.id),
      });
    });

  const nodes = [];
  const edges = [];
  const metaMap = {};
  const searchItems = [];
  const bucketMetaById = {};
  const witnessNodeId = `witness-${selectedWitness.id}`;
  const witnessPosition = positionsMap[witnessNodeId] || { x: 560, y: 40 };

  nodes.push({
    id: witnessNodeId,
    type: 'witness',
    position: witnessPosition,
    data: {
      title: `${selectedWitness.first_name} ${selectedWitness.last_name}`,
      subtitle: roleName,
      badges: [{ label: selectedSide, tone: selectedSide === 'Plaintiff' ? 'green' : selectedSide === 'Defense' ? 'red' : 'amber' }],
      selected: selectedNodeId === witnessNodeId,
    },
  });

  metaMap[witnessNodeId] = {
    id: witnessNodeId,
    entityId: selectedWitness.id,
    type: 'witness',
    witness: selectedWitness,
    roleName,
    bucketCount: relevantBuckets.length,
    trialPointCount: groupedTrialPoints.length,
  };

  searchItems.push({ id: witnessNodeId, label: `${selectedWitness.first_name} ${selectedWitness.last_name}`, type: 'Witness' });

  groupedTrialPoints.forEach((trialPoint, trialPointIndex) => {
    const trialPointNodeId = `trialPoint-${trialPoint.id}`;
    const defaultTrialPointPosition = { x: 180 + trialPointIndex * 340, y: 220 };
    const trialPointPosition = positionsMap[trialPointNodeId] || defaultTrialPointPosition;
    const bucketStatuses = trialPoint.buckets.map((bucket) => getBucketStatus(bucket.id, stateMap));
    const trialPointStatus = bucketStatuses.includes('active')
      ? { label: 'Active', tone: 'blue' }
      : bucketStatuses.length > 0 && bucketStatuses.every((status) => status === 'done')
        ? { label: 'Done', tone: 'green' }
        : bucketStatuses.length > 0 && bucketStatuses.every((status) => status === 'skipped')
          ? { label: 'Skipped', tone: 'amber' }
          : { label: 'Not Started', tone: 'slate' };

    nodes.push({
      id: trialPointNodeId,
      type: 'trialPoint',
      position: trialPointPosition,
      data: {
        title: trialPoint.name,
        badges: [trialPointStatus],
        selected: selectedNodeId === trialPointNodeId,
      },
    });

    edges.push({ id: `${witnessNodeId}-${trialPointNodeId}`, source: witnessNodeId, target: trialPointNodeId, animated: false });

    metaMap[trialPointNodeId] = {
      id: trialPointNodeId,
      entityId: trialPoint.id,
      type: 'trialPoint',
      trialPoint,
      buckets: trialPoint.buckets,
      status: trialPointStatus,
    };

    searchItems.push({ id: trialPointNodeId, label: trialPoint.name, type: 'Trial Point' });

    trialPoint.buckets.forEach((bucket, bucketIndex) => {
      const bucketNodeId = `bucket-${bucket.id}`;
      const topLevelQuestions = getTopLevelQuestions(bucket.id, questions);
      const bucketProofs = getBucketLinkedProofs(bucket.id, questions, admissionBlocks, proofs);
      const bucketStatus = getBucketStatusMeta(getBucketStatus(bucket.id, stateMap));
      const hasProof = bucketProofs.length > 0;
      const needsAdmission = bucketNeedsAdmission(bucket.id, admissionBlocks, proofs);
      const defaultBucketPosition = {
        x: trialPointPosition.x + (bucketIndex - ((trialPoint.buckets.length - 1) / 2)) * 250,
        y: trialPointPosition.y + 180,
      };
      const bucketPosition = positionsMap[bucketNodeId] || defaultBucketPosition;
      const bucketBadges = [bucketStatus, ...(hasProof ? [{ label: 'Has Proof', tone: 'blue' }] : []), ...(needsAdmission ? [{ label: 'Needs Admission', tone: 'amber' }] : [])];

      nodes.push({
        id: bucketNodeId,
        type: 'bucket',
        position: bucketPosition,
        data: {
          title: bucket.name,
          subtitle: bucket.exam_type,
          metrics: [`${topLevelQuestions.length} questions`, `${bucketProofs.length} proofs`],
          badges: bucketBadges,
          selected: selectedNodeId === bucketNodeId,
        },
      });

      edges.push({ id: `${trialPointNodeId}-${bucketNodeId}`, source: trialPointNodeId, target: bucketNodeId });

      bucketMetaById[bucket.id] = {
        sidebarBadges: bucketBadges,
        trialPoint,
        bucket,
        questions: topLevelQuestions,
        proofs: bucketProofs,
      };

      metaMap[bucketNodeId] = {
        id: bucketNodeId,
        entityId: bucket.id,
        type: 'bucket',
        bucket,
        trialPoint,
        questions: topLevelQuestions,
        linkedProofs: bucketProofs,
        status: bucketStatus,
      };

      searchItems.push({ id: bucketNodeId, label: bucket.name, type: 'Bucket' });

      if (expandedBucketId !== bucket.id) return;

      topLevelQuestions.forEach((question, questionIndex) => {
        const questionNodeId = `question-${question.id}`;
        const defaultQuestionPosition = {
          x: bucketPosition.x - (compactView ? 200 : 260),
          y: bucketPosition.y + 150 + questionIndex * (compactView ? 92 : 116),
        };
        const questionPosition = positionsMap[questionNodeId] || defaultQuestionPosition;
        const questionStatus = getQuestionStatusMeta(getQuestionStatus(question.id, stateMap));
        const linkedProofs = getQuestionLinkedProofs(question, proofs);

        nodes.push({
          id: questionNodeId,
          type: 'question',
          position: questionPosition,
          data: {
            title: shortText(question.text, compactView ? 42 : 68),
            badges: [questionStatus],
            selected: selectedNodeId === questionNodeId,
          },
        });

        edges.push({ id: `${bucketNodeId}-${questionNodeId}`, source: bucketNodeId, target: questionNodeId });

        metaMap[questionNodeId] = {
          id: questionNodeId,
          entityId: question.id,
          type: 'question',
          question,
          bucket,
          trialPoint,
          linkedProofs,
          followUps: getFollowUpQuestions(question.id, questions),
          status: questionStatus,
        };

        searchItems.push({ id: questionNodeId, label: shortText(question.text, 80), type: 'Question', bucketId: bucket.id });
      });

      const blocks = getBucketAdmissionBlocks(bucket.id, admissionBlocks);
      const linkedProofIds = new Set();

      blocks.forEach((block, blockIndex) => {
        const blockNodeId = `evidenceBlock-${block.id}`;
        const proof = proofs.find((item) => item.id === block.proof_id) || null;
        const defaultBlockPosition = {
          x: bucketPosition.x + (compactView ? 200 : 260),
          y: bucketPosition.y + 150 + blockIndex * (compactView ? 120 : 140),
        };
        const blockPosition = positionsMap[blockNodeId] || defaultBlockPosition;
        const admissionStatus = getProofAdmissionMeta(proof);
        const publishStatus = getProofPublishedMeta(proof?.id, publishedProofId);

        nodes.push({
          id: blockNodeId,
          type: 'evidenceBlock',
          position: blockPosition,
          data: {
            title: proof?.admitted_exhibit_num || proof?.joint_exhibit_num ? `Admit Exhibit ${proof.admitted_exhibit_num || proof.joint_exhibit_num}` : `Admit ${proof?.formal_name || proof?.name || 'Proof'}`,
            badges: [admissionStatus, publishStatus],
            selected: selectedNodeId === blockNodeId,
          },
        });

        edges.push({ id: `${bucketNodeId}-${blockNodeId}`, source: bucketNodeId, target: blockNodeId });

        metaMap[blockNodeId] = {
          id: blockNodeId,
          entityId: block.id,
          type: 'evidenceBlock',
          block,
          proof,
          bucket,
          trialPoint,
          admissionStatus,
          publishStatus,
        };

        searchItems.push({ id: blockNodeId, label: proof?.formal_name || proof?.name || 'Evidence Block', type: 'Evidence Block', bucketId: bucket.id });

        if (proof) {
          const proofNodeId = `proof-${proof.id}`;
          linkedProofIds.add(proof.id);
          const defaultProofPosition = {
            x: blockPosition.x + (compactView ? 170 : 220),
            y: blockPosition.y,
          };
          const proofPosition = positionsMap[proofNodeId] || defaultProofPosition;
          const proofAdmissionStatus = getProofAdmissionMeta(proof);
          const proofPublishStatus = getProofPublishedMeta(proof.id, publishedProofId);

          nodes.push({
            id: proofNodeId,
            type: 'proof',
            position: proofPosition,
            data: {
              title: proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || proof.formal_name || proof.name,
              subtitle: proof.file_type,
              badges: [proofAdmissionStatus, proofPublishStatus],
              selected: selectedNodeId === proofNodeId,
            },
          });

          edges.push({ id: `${blockNodeId}-${proofNodeId}`, source: blockNodeId, target: proofNodeId });

          metaMap[proofNodeId] = {
            id: proofNodeId,
            entityId: proof.id,
            type: 'proof',
            proof,
            bucket,
            trialPoint,
            admissionStatus: proofAdmissionStatus,
            publishStatus: proofPublishStatus,
          };

          searchItems.push({ id: proofNodeId, label: proof.formal_name || proof.name, type: 'Proof', bucketId: bucket.id });
        }
      });

      getBucketLinkedProofs(bucket.id, questions, admissionBlocks, proofs)
        .filter((proof) => !linkedProofIds.has(proof.id))
        .forEach((proof, proofIndex) => {
          const proofNodeId = `proof-${proof.id}`;
          const defaultProofPosition = {
            x: bucketPosition.x + (compactView ? 210 : 260),
            y: bucketPosition.y + 150 + blocks.length * (compactView ? 120 : 140) + proofIndex * 96,
          };
          const proofPosition = positionsMap[proofNodeId] || defaultProofPosition;
          const proofAdmissionStatus = getProofAdmissionMeta(proof);
          const proofPublishStatus = getProofPublishedMeta(proof.id, publishedProofId);

          nodes.push({
            id: proofNodeId,
            type: 'proof',
            position: proofPosition,
            data: {
              title: proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || proof.formal_name || proof.name,
              subtitle: proof.file_type,
              badges: [proofAdmissionStatus, proofPublishStatus],
              selected: selectedNodeId === proofNodeId,
            },
          });

          edges.push({ id: `${bucketNodeId}-proof-${proof.id}`, source: bucketNodeId, target: proofNodeId });

          metaMap[proofNodeId] = {
            id: proofNodeId,
            entityId: proof.id,
            type: 'proof',
            proof,
            bucket,
            trialPoint,
            admissionStatus: proofAdmissionStatus,
            publishStatus: proofPublishStatus,
          };

          searchItems.push({ id: proofNodeId, label: proof.formal_name || proof.name, type: 'Proof', bucketId: bucket.id });
        });
    });
  });

  return {
    nodes: uniqueById(nodes),
    edges: uniqueById(edges),
    metaMap,
    treeItems: buildTreeItems({ selectedSide, selectedWitness, groupedTrialPoints, bucketMetaById }),
    searchItems: uniqueById(searchItems),
  };
}