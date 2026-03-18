import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AttorneyMapCanvas from '@/components/attorneyMap/AttorneyMapCanvas.jsx';
import MapToolbar from '@/components/attorneyMap/MapToolbar.jsx';
import DetailsPanel from '@/components/attorneyMap/DetailsPanel.jsx';
import {
  buildBucketMap,
  buildOverviewMap,
} from '@/components/attorneyMap/attorneyMapUtils.js';

function buildRecordMap(records = [], keyBuilder) {
  return records.reduce((acc, record) => {
    acc[keyBuilder(record)] = record;
    return acc;
  }, {});
}

function resolveProofUrl(proof) {
  return proof?.video_url || proof?.file_url || null;
}

export default function AttorneyMap() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['attorney-map-me'], queryFn: () => base44.auth.me() });
  const { data: parties = [] } = useQuery({ queryKey: ['attorney-map-parties'], queryFn: () => base44.entities.Party.list() });
  const { data: roles = [] } = useQuery({ queryKey: ['attorney-map-roles'], queryFn: () => base44.entities.Role.list() });
  const { data: buckets = [] } = useQuery({ queryKey: ['attorney-map-buckets'], queryFn: () => base44.entities.Bucket.list() });
  const { data: trialPoints = [] } = useQuery({ queryKey: ['attorney-map-trial-points'], queryFn: () => base44.entities.TrialPoint.list() });
  const { data: questions = [] } = useQuery({ queryKey: ['attorney-map-questions'], queryFn: () => base44.entities.Question.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['attorney-map-proofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: admissionBlocks = [] } = useQuery({ queryKey: ['attorney-map-admission-blocks'], queryFn: () => base44.entities.AdmissionBlock.list() });
  const { data: appSettings = [] } = useQuery({ queryKey: ['attorney-map-settings'], queryFn: () => base44.entities.AppSettings.list() });

  const sideOptions = useMemo(() => [...new Set(parties.map((party) => party.side).filter(Boolean))], [parties]);
  const [selectedSide, setSelectedSide] = useState('');
  const [selectedWitnessId, setSelectedWitnessId] = useState('');
  const [mode, setMode] = useState('overview');
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fitRequestKey, setFitRequestKey] = useState(1);
  const [focusNodeId, setFocusNodeId] = useState('');
  const [stateMap, setStateMap] = useState({});
  const [hubRecordMap, setHubRecordMap] = useState({});
  const [publishedProofIdLocal, setPublishedProofIdLocal] = useState(null);

  useEffect(() => {
    if (!selectedSide && sideOptions.length > 0) {
      setSelectedSide(sideOptions[0]);
    }
  }, [selectedSide, sideOptions]);

  const witnesses = useMemo(() => parties.filter((party) => party.side === selectedSide), [parties, selectedSide]);

  useEffect(() => {
    if (!witnesses.length) return;
    if (!witnesses.some((witness) => witness.id === selectedWitnessId)) {
      setSelectedWitnessId(witnesses[0].id);
      setMode('overview');
      setSelectedBucketId('');
    }
  }, [witnesses, selectedWitnessId]);

  const selectedWitness = witnesses.find((party) => party.id === selectedWitnessId) || null;
  const selectedBucket = buckets.find((bucket) => bucket.id === selectedBucketId) || null;
  const selectedTrialPoint = trialPoints.find((trialPoint) => trialPoint.id === selectedBucket?.trial_point_id) || null;
  const roomId = appSettings[0]?.liveblocks_room_id || 'case-presenter-trial';

  const { data: hubStateRecords = [] } = useQuery({
    queryKey: ['attorney-map-state', selectedWitnessId, me?.email],
    enabled: !!selectedWitnessId && !!me?.email,
    queryFn: () => base44.entities.AttorneyHubState.filter({ witness_id: selectedWitnessId, created_by: me.email }, '-updated_date', 500),
  });

  const { data: juryStateRecords = [] } = useQuery({
    queryKey: ['attorney-map-jury-state', roomId],
    queryFn: () => base44.entities.JuryState.filter({ room_id: roomId }, '-updated_date', 5),
  });

  useEffect(() => {
    setStateMap(buildRecordMap(hubStateRecords, (record) => `${record.node_type}:${record.node_id}`));
    setHubRecordMap(buildRecordMap(hubStateRecords, (record) => `${record.node_type}:${record.node_id}`));
  }, [hubStateRecords]);

  const juryState = juryStateRecords[0] || null;

  useEffect(() => {
    setPublishedProofIdLocal(juryState?.published_proof_id || null);
  }, [juryState?.published_proof_id]);

  const overviewGraph = useMemo(() => buildOverviewMap({
    selectedSide,
    selectedWitness,
    roles,
    buckets,
    trialPoints,
    questions,
    admissionBlocks,
    proofs,
    stateMap,
    selectedNodeId,
  }), [selectedSide, selectedWitness, roles, buckets, trialPoints, questions, admissionBlocks, proofs, stateMap, selectedNodeId]);

  const bucketGraph = useMemo(() => buildBucketMap({
    bucket: selectedBucket,
    trialPoint: selectedTrialPoint,
    questions,
    admissionBlocks,
    proofs,
    stateMap,
    selectedNodeId,
    publishedProofId: publishedProofIdLocal,
  }), [selectedBucket, selectedTrialPoint, questions, admissionBlocks, proofs, stateMap, selectedNodeId, publishedProofIdLocal]);

  const currentGraph = mode === 'bucket' ? bucketGraph : overviewGraph;
  const selectedMeta = currentGraph.metaMap[selectedNodeId] || null;

  useEffect(() => {
    if (!currentGraph.defaultNodeId) return;
    if (!currentGraph.metaMap[selectedNodeId]) {
      setSelectedNodeId(currentGraph.defaultNodeId);
    }
  }, [currentGraph.defaultNodeId, currentGraph.metaMap, selectedNodeId]);

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return currentGraph.searchItems
      .filter((item) => item.label.toLowerCase().includes(term) || item.type.toLowerCase().includes(term))
      .slice(0, 8);
  }, [currentGraph.searchItems, searchTerm]);

  const saveHubState = async (nodeType, nodeId, status) => {
    if (!selectedWitnessId) return;
    const key = `${nodeType}:${nodeId}`;
    const existing = hubRecordMap[key];
    const nextState = { witness_id: selectedWitnessId, node_id: nodeId, node_type: nodeType, status };
    setStateMap((prev) => ({ ...prev, [key]: nextState }));

    if (existing?.id) {
      const updated = await base44.entities.AttorneyHubState.update(existing.id, nextState);
      setHubRecordMap((prev) => ({ ...prev, [key]: updated }));
      return;
    }

    const created = await base44.entities.AttorneyHubState.create(nextState);
    setHubRecordMap((prev) => ({ ...prev, [key]: created }));
  };

  const ensureJuryRecord = async () => {
    if (juryState) return juryState;
    return base44.entities.JuryState.create({ room_id: roomId, is_blank: true });
  };

  const publishProof = async (proof) => {
    if (!proof) return;
    const record = await ensureJuryRecord();
    await base44.entities.JuryState.update(record.id, {
      room_id: roomId,
      published_proof_id: proof.id,
      exhibit_label: proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || proof.formal_name || proof.name,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: false,
    });
    setPublishedProofIdLocal(proof.id);
  };

  const blankJury = async () => {
    const record = await ensureJuryRecord();
    await base44.entities.JuryState.update(record.id, {
      room_id: roomId,
      published_proof_id: null,
      exhibit_label: '',
      is_blank: true,
      is_playing: false,
    });
    setPublishedProofIdLocal(null);
  };

  const handleOpenProof = (proof) => {
    const url = resolveProofUrl(proof);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenBucketMap = (bucketId) => {
    setSelectedBucketId(bucketId);
    setMode('bucket');
    setSearchTerm('');
    const headerId = `bucket-summary-${bucketId}`;
    setSelectedNodeId(headerId);
    setFocusNodeId(headerId);
    setFitRequestKey((value) => value + 1);
  };

  const handleSelectNode = (nodeId) => {
    if (mode === 'overview' && nodeId.startsWith('overview-bucket-')) {
      handleOpenBucketMap(nodeId.replace('overview-bucket-', ''));
      return;
    }

    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
  };

  const handleSelectSearch = (result) => {
    if (mode === 'overview' && result.bucketId) {
      handleOpenBucketMap(result.bucketId);
      return;
    }

    setSelectedNodeId(result.id);
    setFocusNodeId(result.id);
    setSearchTerm('');
  };

  const handleSkipProof = () => {
    const nextNodeId = bucketGraph.nextNodeIdMap[selectedNodeId] || selectedMeta?.nextSequenceId;
    if (!nextNodeId) return;
    setSelectedNodeId(nextNodeId);
    setFocusNodeId(nextNodeId);
  };

  const handleGoToPath = (pathKey) => {
    if (!selectedMeta) return;
    const targetId = pathKey === 'admitted' ? selectedMeta.admittedPathStartId : selectedMeta.notAdmittedPathStartId;
    if (!targetId) return;
    setSelectedNodeId(targetId);
    setFocusNodeId(targetId);
  };

  const handleAdmitProof = async ({ proof, admittedExhibitNum, admittedBy }) => {
    if (!proof || !admittedExhibitNum.trim()) return;
    await base44.entities.Proof.update(proof.id, {
      status: 'Admitted',
      admitted_exhibit_num: admittedExhibitNum.trim(),
      admitted_by: admittedBy,
      admit_date: new Date().toISOString().slice(0, 10),
    });
    await queryClient.invalidateQueries({ queryKey: ['attorney-map-proofs'] });
    if (selectedMeta?.admittedPathStartId) {
      setSelectedNodeId(selectedMeta.admittedPathStartId);
      setFocusNodeId(selectedMeta.admittedPathStartId);
    }
  };

  const handleMarkDemonstrative = async (proof) => {
    if (!proof?.joint_exhibit_num) return;
    await base44.entities.Proof.update(proof.id, {
      status: 'Demonstrative',
      demonstrative_exhibit_num: proof.joint_exhibit_num,
    });
    await queryClient.invalidateQueries({ queryKey: ['attorney-map-proofs'] });
    if (selectedMeta?.admittedPathStartId) {
      setSelectedNodeId(selectedMeta.admittedPathStartId);
      setFocusNodeId(selectedMeta.admittedPathStartId);
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden">
      <div className="flex h-full flex-col">
        <MapToolbar
          mode={mode}
          bucket={selectedBucket}
          sideOptions={sideOptions}
          selectedSide={selectedSide}
          onSelectSide={(value) => {
            setSelectedSide(value);
            setMode('overview');
            setSelectedBucketId('');
          }}
          witnesses={witnesses}
          selectedWitnessId={selectedWitnessId}
          onSelectWitness={(value) => {
            setSelectedWitnessId(value);
            setMode('overview');
            setSelectedBucketId('');
          }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchResults={searchResults}
          onSelectSearch={handleSelectSearch}
          onBack={() => {
            setMode('overview');
            setSelectedBucketId('');
            setSearchTerm('');
            setFitRequestKey((value) => value + 1);
          }}
          onFit={() => setFitRequestKey((value) => value + 1)}
        />

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1">
            <AttorneyMapCanvas
              nodes={currentGraph.nodes}
              edges={currentGraph.edges}
              fitRequestKey={fitRequestKey}
              focusNodeId={focusNodeId}
              onSelectNode={handleSelectNode}
            />
          </main>

          <DetailsPanel
            mode={mode}
            selectedMeta={selectedMeta}
            onOpenBucketMap={handleOpenBucketMap}
            onOpenProof={handleOpenProof}
            onPublishProof={publishProof}
            onBlankJury={blankJury}
            onMarkQuestionAsked={(questionId) => saveHubState('question', questionId, 'asked')}
            onGoToPath={handleGoToPath}
            onSkipProof={handleSkipProof}
            onAdmitProof={handleAdmitProof}
            onMarkDemonstrative={handleMarkDemonstrative}
          />
        </div>
      </div>
    </div>
  );
}