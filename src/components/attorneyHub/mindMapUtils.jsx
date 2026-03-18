const BRANCH_COLORS = ['#b91c1c', '#f59e0b', '#0f766e', '#1d4ed8', '#db2777', '#7c3aed', '#0891b2', '#15803d'];

function parseProofIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    try {
      return parseProofIds(JSON.parse(value));
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  if (typeof value === 'object' && Array.isArray(value.ids)) {
    return value.ids.filter(Boolean);
  }

  return [];
}

function getStatusTone(status) {
  if (status === 'Done') return 'green';
  if (status === 'Active') return 'blue';
  if (status === 'Skipped') return 'red';
  return 'slate';
}

function getProofTone(proof) {
  if (proof?.status === 'Admitted') return 'green';
  if (proof?.status === 'Demonstrative') return 'purple';
  if (proof?.status === 'Joint') return 'blue';
  return 'slate';
}

function makeBadge(label, tone) {
  return { label, tone };
}

export function getBucketStatus(bucketId, layoutDraft = {}) {
  if (layoutDraft.bucket_statuses?.[bucketId]) return layoutDraft.bucket_statuses[bucketId];
  if (layoutDraft.active_bucket_id === bucketId) return 'Active';
  return 'Not Started';
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
  questions = [],
  proofs = [],
  admissionBlocks = [],
  bucketProofLinks = [],
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
  const witnessPosition = nodePositions[witnessId] || { x: 0, y: 0 };
  nodes.push({
    id: witnessId,
    type: 'witnessNode',
    position: witnessPosition,
    data: {
      title: `${party.first_name} ${party.last_name}`,
      subtitle: party.side,
      meta: party.role_id ? ['Witness'] : [],
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
      y: Math.sin(angle) * 230,
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

    searchIndex.push({
      id: `search-${trialPointId}`,
      nodeId: trialPointId,
      type: 'trialPoint',
      label: group.trialPoint.name,
      subtitle: party.side,
      parentBucketId: null,
    });

    const bucketCount = Math.max(group.buckets.length, 1);
    group.buckets.forEach((bucket, bucketIndex) => {
      const spread = bucketCount === 1 ? 0 : ((bucketIndex / (bucketCount - 1)) - 0.5) * 1.45;
      const bucketAngle = angle + spread;
      const bucketId = `bucket-${bucket.id}`;
      const bucketQuestions = questions
        .filter((question) => question.bucket_id === bucket.id && !question.parent_question_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const bucketBlocks = admissionBlocks
        .filter((block) => block.bucket_id === bucket.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const bucketLinks = bucketProofLinks
        .filter((link) => link.bucket_id === bucket.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const questionProofIds = Array.from(new Set(bucketQuestions.flatMap((question) => parseProofIds(question.proof_ids))));
      const linkedProofIds = Array.from(new Set([
        ...bucketLinks.map((link) => link.proof_id),
        ...questionProofIds,
        ...bucketBlocks.map((block) => block.proof_id),
      ].filter(Boolean)));
      const linkedProofs = linkedProofIds.map((proofId) => proofMap.get(proofId)).filter(Boolean);
      const hasProof = linkedProofs.length > 0;
      const needsAdmission = linkedProofs.some((proof) => proof.proof_category !== 'Deposition' && !['Admitted', 'Demonstrative'].includes(proof.status));
      const bucketStatus = getBucketStatus(bucket.id, layoutDraft);
      const bucketPosition = nodePositions[bucketId] || {
        x: trialPointPosition.x + Math.cos(bucketAngle) * (compactMode ? 250 : 290),
        y: trialPointPosition.y + Math.sin(bucketAngle) * (compactMode ? 180 : 220),
      };

      nodes.push({
        id: bucketId,
        type: 'bucketNode',
        position: bucketPosition,
        data: {
          title: bucket.name,
          subtitle: group.trialPoint.name,
          meta: [`${bucketQuestions.length} Q`, `${linkedProofs.length} Proof`],
          badges: [
            makeBadge(bucketStatus, getStatusTone(bucketStatus)),
            ...(hasProof ? [makeBadge('Has Proof', 'teal')] : []),
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
        questions: bucketQuestions,
        linkedProofs,
        linkedProofEntries: bucketLinks,
        admissionBlocks: bucketBlocks,
        branchColor: color,
        status: bucketStatus,
        needsAdmission,
      };

      searchIndex.push({
        id: `search-${bucketId}`,
        nodeId: bucketId,
        type: 'bucket',
        label: bucket.name,
        subtitle: group.trialPoint.name,
        parentBucketId: bucket.id,
      });

      bucketQuestions.forEach((question) => {
        const questionId = `question::${bucket.id}::${question.id}`;
        searchIndex.push({
          id: `search-${questionId}`,
          nodeId: questionId,
          type: 'question',
          label: question.text,
          subtitle: bucket.name,
          parentBucketId: bucket.id,
        });
      });

      bucketBlocks.forEach((block) => {
        const blockId = `block::${bucket.id}::${block.id}`;
        const blockProof = proofMap.get(block.proof_id) || null;
        searchIndex.push({
          id: `search-${blockId}`,
          nodeId: blockId,
          type: 'evidence',
          label: blockProof ? `Admission: ${blockProof.formal_name || blockProof.name}` : 'Admission Block',
          subtitle: bucket.name,
          parentBucketId: bucket.id,
        });
      });

      linkedProofs.forEach((proof) => {
        const proofNodeId = `proof-${bucket.id}-${proof.id}`;
        const directLink = bucketLinks.find((link) => link.proof_id === proof.id) || null;
        searchIndex.push({
          id: `search-${proofNodeId}`,
          nodeId: proofNodeId,
          type: 'proof',
          label: directLink?.node_label || proof.formal_name || proof.name,
          subtitle: bucket.name,
          parentBucketId: bucket.id,
        });
      });

      if (!expandedSet.has(bucket.id)) return;

      bucketQuestions.forEach((question, questionIndex) => {
        const questionId = `question::${bucket.id}::${question.id}`;
        const questionProofs = parseProofIds(question.proof_ids).map((proofId) => proofMap.get(proofId)).filter(Boolean);
        const questionPosition = nodePositions[questionId] || {
          x: bucketPosition.x - (compactMode ? 240 : 280),
          y: bucketPosition.y - 60 + questionIndex * (compactMode ? 90 : 110),
        };
        const asked = !!layoutDraft.asked_question_ids?.[question.id];

        nodes.push({
          id: questionId,
          type: 'questionNode',
          position: questionPosition,
          data: {
            title: question.text,
            subtitle: question.expected_answer || 'Question cluster',
            meta: compactMode ? [] : [`${questionProofs.length} linked proof${questionProofs.length === 1 ? '' : 's'}`],
            badges: [
              ...(asked ? [makeBadge('Asked', 'green')] : [makeBadge('Unasked', 'slate')]),
              ...(questionProofs.length > 0 ? [makeBadge('Has Proof', 'teal')] : []),
            ],
            accent: color,
            compact: compactMode,
          },
          selected: selectedNodeId === questionId,
        });
        edges.push({
          id: `edge-${bucketId}-${questionId}`,
          source: bucketId,
          target: questionId,
          style: { stroke: color, strokeWidth: 1.75 },
        });
        lookup[questionId] = {
          type: 'question',
          question,
          bucket,
          trialPoint: group.trialPoint,
          linkedProofs: questionProofs,
          branchColor: color,
        };
      });

      bucketBlocks.forEach((block, blockIndex) => {
        const blockId = `block::${bucket.id}::${block.id}`;
        const blockProof = proofMap.get(block.proof_id) || null;
        const blockPosition = nodePositions[blockId] || {
          x: bucketPosition.x,
          y: bucketPosition.y + 160 + blockIndex * 120,
        };

        nodes.push({
          id: blockId,
          type: 'evidenceBlockNode',
          position: blockPosition,
          data: {
            title: blockProof ? `Admit ${getProofDisplayLabel(blockProof)}` : 'Admission Block',
            subtitle: blockProof?.status || 'Needs ruling',
            meta: compactMode ? [] : ['Foundation path'],
            badges: [makeBadge(blockProof?.status || 'Not Marked', getProofTone(blockProof))],
            accent: color,
            compact: compactMode,
          },
          selected: selectedNodeId === blockId,
        });
        edges.push({
          id: `edge-${bucketId}-${blockId}`,
          source: bucketId,
          target: blockId,
          style: { stroke: color, strokeWidth: 1.9, strokeDasharray: '6 4' },
        });

        lookup[blockId] = {
          type: 'evidenceBlock',
          block,
          bucket,
          proof: blockProof,
          trialPoint: group.trialPoint,
          branchColor: color,
        };
      });

      linkedProofs.forEach((proof, proofIndex) => {
        const proofId = `proof::${bucket.id}::${proof.id}`;
        const directLink = bucketLinks.find((link) => link.proof_id === proof.id) || null;
        const connectedBlock = bucketBlocks.find((block) => block.proof_id === proof.id) || null;
        const proofPosition = nodePositions[proofId] || {
          x: bucketPosition.x + (compactMode ? 250 : 300),
          y: bucketPosition.y - 60 + proofIndex * (compactMode ? 96 : 120),
        };
        const published = juryState?.published_proof_id === proof.id && !juryState?.is_blank;

        nodes.push({
          id: proofId,
          type: 'proofNode',
          position: proofPosition,
          data: {
            title: directLink?.node_label || getProofDisplayLabel(proof),
            subtitle: directLink?.why_it_matters || proof.formal_name || proof.name,
            meta: [proof.file_type || 'Proof'],
            badges: [
              makeBadge(proof.status || 'Draft', getProofTone(proof)),
              ...(published ? [makeBadge('Published', 'pink')] : []),
            ],
            accent: color,
            compact: compactMode,
          },
          selected: selectedNodeId === proofId,
        });

        edges.push({
          id: `edge-${connectedBlock ? `block::${bucket.id}::${connectedBlock.id}` : bucketId}-${proofId}`,
          source: connectedBlock ? `block::${bucket.id}::${connectedBlock.id}` : bucketId,
          target: proofId,
          style: { stroke: color, strokeWidth: 1.8 },
        });

        lookup[proofId] = {
          type: 'proof',
          proof,
          bucket,
          trialPoint: group.trialPoint,
          link: directLink,
          branchColor: color,
          published,
        };
      });
    });
  });

  return { nodes, edges, lookup, searchIndex, sidebarGroups };
}