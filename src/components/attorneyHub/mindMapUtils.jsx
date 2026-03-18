const BRANCH_COLORS = ['#b91c1c', '#f59e0b', '#0f766e', '#1d4ed8', '#db2777', '#7c3aed', '#0891b2', '#15803d'];

function makeBadge(label, tone) {
  return { label, tone };
}

function getStatusTone(status) {
  if (status === 'Done') return 'green';
  if (status === 'Active') return 'blue';
  if (status === 'Skipped') return 'red';
  return 'slate';
}

export function getBucketStatus(bucketId, layoutDraft = {}) {
  if (layoutDraft.bucket_statuses?.[bucketId]) return layoutDraft.bucket_statuses[bucketId];
  if (layoutDraft.active_bucket_id === bucketId) return 'Active';
  return 'Not Started';
}

export function getBlockOutcome(block, proof, layoutDraft = {}) {
  const local = layoutDraft.block_outcomes?.[block?.id];
  if (local) return local;
  if (proof?.status === 'Admitted') return 'admitted';
  if (proof?.status === 'Demonstrative') return 'demonstrative';
  return 'needs_admission';
}

export function getOutcomeBadge(outcome) {
  if (outcome === 'admitted') return makeBadge('Admitted', 'green');
  if (outcome === 'demonstrative') return makeBadge('Demonstrative', 'purple');
  if (outcome === 'not_admitted') return makeBadge('Not Admitted', 'red');
  return makeBadge('Needs Admission', 'amber');
}

export function isProofPublishable(proof) {
  return proof?.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(proof?.status);
}

export function getProofDisplayLabel(proof) {
  const exhibitNum = proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num;
  if (exhibitNum && proof?.status === 'Demonstrative') return `Demonstrative ${exhibitNum}`;
  if (exhibitNum && proof?.status === 'Admitted') return `Exhibit ${exhibitNum}`;
  if (exhibitNum) return exhibitNum;
  return proof?.formal_name || proof?.name || 'Proof';
}

export function buildMindMapGraph({
  party,
  trialPoints = [],
  buckets = [],
  questionGroups = [],
  questions = [],
  proofs = [],
  admissionBlocks = [],
  layoutDraft = {},
  compactMode = false,
  expandedBucketIds = [],
  selectedNodeId = null,
  juryState = null,
}) {
  if (!party) {
    return { nodes: [], edges: [], lookup: {}, searchIndex: [], sidebarGroups: [] };
  }

  const nodePositions = layoutDraft.node_positions || {};
  const proofMap = new Map(proofs.map((proof) => [proof.id, proof]));
  const trialPointMap = new Map(trialPoints.map((point) => [point.id, point]));
  const expandedSet = new Set(expandedBucketIds);
  const lookup = {};
  const edges = [];
  const nodes = [];
  const searchIndex = [];

  const groupsByBucket = new Map();
  questionGroups.forEach((group) => {
    if (!groupsByBucket.has(group.bucket_id)) groupsByBucket.set(group.bucket_id, []);
    groupsByBucket.get(group.bucket_id).push(group);
  });

  const questionsByGroup = new Map();
  questions.forEach((question) => {
    if (!question.question_group_id) return;
    if (!questionsByGroup.has(question.question_group_id)) questionsByGroup.set(question.question_group_id, []);
    questionsByGroup.get(question.question_group_id).push(question);
  });

  const blocksByGroup = new Map();
  admissionBlocks.forEach((block) => {
    if (!block.question_group_id) return;
    if (!blocksByGroup.has(block.question_group_id)) blocksByGroup.set(block.question_group_id, []);
    blocksByGroup.get(block.question_group_id).push(block);
  });

  const blocksByBucket = new Map();
  admissionBlocks.forEach((block) => {
    if (!blocksByBucket.has(block.bucket_id)) blocksByBucket.set(block.bucket_id, []);
    blocksByBucket.get(block.bucket_id).push(block);
  });

  const bucketsByTrialPoint = new Map();
  buckets.forEach((bucket) => {
    const key = bucket.trial_point_id || 'unassigned';
    if (!bucketsByTrialPoint.has(key)) bucketsByTrialPoint.set(key, []);
    bucketsByTrialPoint.get(key).push(bucket);
  });

  const sidebarGroups = Array.from(bucketsByTrialPoint.entries()).map(([trialPointId, groupBuckets]) => ({
    trialPoint: trialPointId === 'unassigned'
      ? { id: 'unassigned', name: 'Loose Buckets' }
      : trialPointMap.get(trialPointId) || { id: trialPointId, name: 'Loose Buckets' },
    buckets: [...groupBuckets].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  }));

  const witnessId = `witness-${party.id}`;
  nodes.push({
    id: witnessId,
    type: 'witnessNode',
    position: nodePositions[witnessId] || { x: 0, y: 0 },
    data: {
      title: `${party.first_name} ${party.last_name}`,
      subtitle: party.side,
      meta: ['Witness'],
      badges: [makeBadge(party.side, party.side === 'Plaintiff' ? 'green' : party.side === 'Defense' ? 'red' : 'amber')],
      accent: '#0f172a',
      compact: compactMode,
    },
    selected: selectedNodeId === witnessId,
  });
  lookup[witnessId] = { type: 'witness', party };

  const branchCount = Math.max(sidebarGroups.length, 1);

  sidebarGroups.forEach((group, groupIndex) => {
    const color = BRANCH_COLORS[groupIndex % BRANCH_COLORS.length];
    const angle = (Math.PI * 2 * groupIndex) / branchCount - Math.PI / 2;
    const trialPointId = `trialpoint-${group.trialPoint.id}`;
    const trialPointPosition = nodePositions[trialPointId] || {
      x: Math.cos(angle) * 320,
      y: Math.sin(angle) * 220,
    };

    nodes.push({
      id: trialPointId,
      type: 'trialPointNode',
      position: trialPointPosition,
      data: {
        title: group.trialPoint.name,
        subtitle: `${group.buckets.length} bucket${group.buckets.length === 1 ? '' : 's'}`,
        badges: [],
        meta: compactMode ? [] : ['Branch'],
        accent: color,
        compact: compactMode,
      },
      selected: selectedNodeId === trialPointId,
    });

    edges.push({
      id: `edge-${witnessId}-${trialPointId}`,
      source: witnessId,
      target: trialPointId,
      style: { stroke: color, strokeWidth: 2.25 },
    });

    lookup[trialPointId] = { type: 'trialPoint', trialPoint: group.trialPoint };
    searchIndex.push({ id: `search-${trialPointId}`, nodeId: trialPointId, type: 'trialPoint', label: group.trialPoint.name, subtitle: party.side });

    const bucketCount = Math.max(group.buckets.length, 1);
    group.buckets.forEach((bucket, bucketIndex) => {
      const spread = bucketCount === 1 ? 0 : ((bucketIndex / (bucketCount - 1)) - 0.5) * 1.4;
      const bucketAngle = angle + spread;
      const bucketId = `bucket-${bucket.id}`;
      const bucketGroupItems = [...(groupsByBucket.get(bucket.id) || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const bucketBlocks = [...(blocksByBucket.get(bucket.id) || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const bucketStatus = getBucketStatus(bucket.id, layoutDraft);
      const needsAdmission = bucketBlocks.some((block) => getBlockOutcome(block, proofMap.get(block.proof_id), layoutDraft) === 'needs_admission');
      const bucketPosition = nodePositions[bucketId] || {
        x: trialPointPosition.x + Math.cos(bucketAngle) * (compactMode ? 260 : 300),
        y: trialPointPosition.y + Math.sin(bucketAngle) * (compactMode ? 190 : 230),
      };

      nodes.push({
        id: bucketId,
        type: 'bucketNode',
        position: bucketPosition,
        data: {
          title: bucket.name,
          subtitle: group.trialPoint.name,
          meta: [`${bucketGroupItems.length} groups`, `${bucketBlocks.length} admission block${bucketBlocks.length === 1 ? '' : 's'}`],
          badges: [
            makeBadge(bucketStatus, getStatusTone(bucketStatus)),
            ...(bucketGroupItems.some((item) => !!item.proof_id) ? [makeBadge('Has Proof', 'teal')] : []),
            ...(needsAdmission ? [makeBadge('Needs Admission', 'amber')] : []),
          ],
          accent: color,
          compact: compactMode,
        },
        selected: selectedNodeId === bucketId,
      });

      edges.push({
        id: `edge-${trialPointId}-${bucketId}`,
        source: trialPointId,
        target: bucketId,
        style: { stroke: color, strokeWidth: 2 },
      });

      lookup[bucketId] = {
        type: 'bucket',
        bucket,
        trialPoint: group.trialPoint,
        questionGroups: bucketGroupItems,
        admissionBlocks: bucketBlocks,
        status: bucketStatus,
      };

      searchIndex.push({ id: `search-${bucketId}`, nodeId: bucketId, type: 'bucket', label: bucket.name, subtitle: group.trialPoint.name });

      if (!expandedSet.has(bucket.id)) return;

      bucketGroupItems.forEach((questionGroup, groupIndex) => {
        const groupNodeId = `group::${questionGroup.id}`;
        const groupQuestions = [...(questionsByGroup.get(questionGroup.id) || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const groupBlocks = [...(blocksByGroup.get(questionGroup.id) || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const focusProof = questionGroup.proof_id ? proofMap.get(questionGroup.proof_id) || null : null;
        const groupPosition = nodePositions[groupNodeId] || {
          x: bucketPosition.x + (compactMode ? 230 : 270),
          y: bucketPosition.y - 90 + groupIndex * (compactMode ? 100 : 120),
        };

        nodes.push({
          id: groupNodeId,
          type: 'questionNode',
          position: groupPosition,
          data: {
            title: questionGroup.node_label || questionGroup.name,
            subtitle: questionGroup.why_it_matters || (focusProof ? getProofDisplayLabel(focusProof) : 'Question group'),
            meta: [`${groupQuestions.length} questions`],
            badges: [
              ...(focusProof ? [makeBadge('Proof Focus', 'teal')] : []),
              ...(groupBlocks.length > 0 ? [makeBadge(`${groupBlocks.length} admission`, 'amber')] : []),
            ],
            accent: color,
            compact: compactMode,
          },
          selected: selectedNodeId === groupNodeId,
        });

        edges.push({
          id: `edge-${bucketId}-${groupNodeId}`,
          source: bucketId,
          target: groupNodeId,
          style: { stroke: color, strokeWidth: 1.9 },
        });

        lookup[groupNodeId] = {
          type: 'questionGroup',
          questionGroup,
          bucket,
          trialPoint: group.trialPoint,
          questions: groupQuestions,
          proof: focusProof,
          admissionBlocks: groupBlocks,
        };

        searchIndex.push({ id: `search-${groupNodeId}`, nodeId: groupNodeId, type: 'group', label: questionGroup.name, subtitle: bucket.name });
        if (focusProof) {
          searchIndex.push({ id: `search-proof-${focusProof.id}-${groupNodeId}`, nodeId: groupNodeId, type: 'proof', label: focusProof.formal_name || focusProof.name, subtitle: questionGroup.name });
        }

        groupBlocks.forEach((block, blockIndex) => {
          const blockNodeId = `block::${block.id}`;
          const proof = proofMap.get(block.proof_id) || null;
          const outcome = getBlockOutcome(block, proof, layoutDraft);
          const blockPosition = nodePositions[blockNodeId] || {
            x: groupPosition.x + (compactMode ? 210 : 240),
            y: groupPosition.y - 20 + blockIndex * (compactMode ? 88 : 104),
          };

          nodes.push({
            id: blockNodeId,
            type: 'evidenceBlockNode',
            position: blockPosition,
            data: {
              title: proof ? `Admit ${getProofDisplayLabel(proof)}` : 'Admission Block',
              subtitle: proof?.formal_name || proof?.name || 'Foundation reminder',
              meta: compactMode ? [] : ['Remembered steps'],
              badges: [getOutcomeBadge(outcome)],
              accent: color,
              compact: compactMode,
            },
            selected: selectedNodeId === blockNodeId,
          });

          edges.push({
            id: `edge-${groupNodeId}-${blockNodeId}`,
            source: groupNodeId,
            target: blockNodeId,
            style: { stroke: color, strokeWidth: 1.7, strokeDasharray: '6 4' },
          });

          lookup[blockNodeId] = {
            type: 'evidenceBlock',
            block,
            proof,
            bucket,
            trialPoint: group.trialPoint,
            questionGroup,
            outcome,
            published: proof ? juryState?.published_proof_id === proof.id && !juryState?.is_blank : false,
          };

          searchIndex.push({ id: `search-${blockNodeId}`, nodeId: blockNodeId, type: 'admission', label: proof ? getProofDisplayLabel(proof) : 'Admission Block', subtitle: questionGroup.name });
        });
      });
    });
  });

  return { nodes, edges, lookup, searchIndex, sidebarGroups };
}