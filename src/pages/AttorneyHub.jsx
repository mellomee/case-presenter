import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReactFlowProvider } from '@xyflow/react';
import { Search, Shrink, Maximize2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import MindMapCanvas from '@/components/attorneyHub/MindMapCanvas.jsx';
import MindMapSidebar from '@/components/attorneyHub/MindMapSidebar.jsx';
import MindMapDetailsPanel from '@/components/attorneyHub/MindMapDetailsPanel.jsx';
import {
  buildMapData,
  getBucketAdmissionBlocks,
  getBucketLinkedProofs,
  getProofAdmissionMeta,
  getProofPublishedMeta,
} from '@/components/attorneyHub/mapUtils';

function buildRecordMap(records = [], keyBuilder) {
  return records.reduce((acc, record) => {
    acc[keyBuilder(record)] = record;
    return acc;
  }, {});
}

function resolveProofUrl(proof) {
  return proof?.video_url || proof?.file_url || null;
}

function AttorneyHubContent() {
  const { data: me } = useQuery({ queryKey: ['attorney-hub-me'], queryFn: () => base44.auth.me() });
  const { data: parties = [] } = useQuery({ queryKey: ['attorney-hub-parties'], queryFn: () => base44.entities.Party.list() });
  const { data: roles = [] } = useQuery({ queryKey: ['attorney-hub-roles'], queryFn: () => base44.entities.Role.list() });
  const { data: buckets = [] } = useQuery({ queryKey: ['attorney-hub-buckets'], queryFn: () => base44.entities.Bucket.list() });
  const { data: trialPoints = [] } = useQuery({ queryKey: ['attorney-hub-trial-points'], queryFn: () => base44.entities.TrialPoint.list() });
  const { data: questions = [] } = useQuery({ queryKey: ['attorney-hub-questions'], queryFn: () => base44.entities.Question.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['attorney-hub-proofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: admissionBlocks = [] } = useQuery({ queryKey: ['attorney-hub-admission-blocks'], queryFn: () => base44.entities.AdmissionBlock.list() });
  const { data: appSettings = [] } = useQuery({ queryKey: ['attorney-hub-settings'], queryFn: () => base44.entities.AppSettings.list() });

  const sideOptions = useMemo(() => [...new Set(parties.map((party) => party.side).filter(Boolean))], [parties]);
  const [selectedSide, setSelectedSide] = useState('');
  const [selectedWitnessId, setSelectedWitnessId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [compactView, setCompactView] = useState(true);
  const [expandedBucketId, setExpandedBucketId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [fitRequestKey, setFitRequestKey] = useState(1);
  const [focusRequest, setFocusRequest] = useState(null);
  const [positionsMap, setPositionsMap] = useState({});
  const [positionRecordMap, setPositionRecordMap] = useState({});
  const [stateMap, setStateMap] = useState({});
  const [hubRecordMap, setHubRecordMap] = useState({});
  const [publishedProofIdLocal, setPublishedProofIdLocal] = useState(null);

  useEffect(() => {
    if (!selectedSide && sideOptions.length > 0) {
      setSelectedSide(sideOptions[0]);
    }
  }, [selectedSide, sideOptions]);

  const witnesses = useMemo(
    () => parties.filter((party) => party.side === selectedSide),
    [parties, selectedSide]
  );

  useEffect(() => {
    if (!witnesses.length) return;
    if (!witnesses.some((witness) => witness.id === selectedWitnessId)) {
      setSelectedWitnessId(witnesses[0].id);
    }
  }, [witnesses, selectedWitnessId]);

  const selectedWitness = witnesses.find((party) => party.id === selectedWitnessId) || null;
  const roomId = appSettings[0]?.liveblocks_room_id || 'case-presenter-trial';

  const { data: positionRecords = [] } = useQuery({
    queryKey: ['attorney-hub-positions', selectedWitnessId, me?.email],
    enabled: !!selectedWitnessId && !!me?.email,
    queryFn: () => base44.entities.MindMapNodePosition.filter({ witness_id: selectedWitnessId, created_by: me.email }, '-updated_date', 500),
  });

  const { data: hubStateRecords = [] } = useQuery({
    queryKey: ['attorney-hub-state', selectedWitnessId, me?.email],
    enabled: !!selectedWitnessId && !!me?.email,
    queryFn: () => base44.entities.AttorneyHubState.filter({ witness_id: selectedWitnessId, created_by: me.email }, '-updated_date', 500),
  });

  const { data: juryStateRecords = [] } = useQuery({
    queryKey: ['attorney-hub-jury-state', roomId],
    queryFn: () => base44.entities.JuryState.filter({ room_id: roomId }, '-updated_date', 5),
  });

  useEffect(() => {
    setPositionsMap(buildRecordMap(positionRecords, (record) => record.node_id));
    setPositionRecordMap(buildRecordMap(positionRecords, (record) => record.node_id));
  }, [positionRecords]);

  useEffect(() => {
    setStateMap(buildRecordMap(hubStateRecords, (record) => `${record.node_type}:${record.node_id}`));
    setHubRecordMap(buildRecordMap(hubStateRecords, (record) => `${record.node_type}:${record.node_id}`));
  }, [hubStateRecords]);

  const juryState = juryStateRecords[0] || null;

  useEffect(() => {
    setPublishedProofIdLocal(juryState?.published_proof_id || null);
  }, [juryState?.published_proof_id]);

  const publishedProofId = publishedProofIdLocal;

  const mapData = useMemo(() => buildMapData({
    selectedSide,
    selectedWitness,
    roles,
    buckets,
    trialPoints,
    questions,
    admissionBlocks,
    proofs,
    stateMap,
    positionsMap,
    expandedBucketId,
    compactView,
    publishedProofId,
    selectedNodeId,
  }), [selectedSide, selectedWitness, roles, buckets, trialPoints, questions, admissionBlocks, proofs, stateMap, positionsMap, expandedBucketId, compactView, publishedProofId, selectedNodeId]);

  useEffect(() => {
    if (!selectedWitness) return;
    const witnessNodeId = `witness-${selectedWitness.id}`;
    if (!selectedNodeId || !mapData.metaMap[selectedNodeId]) {
      setSelectedNodeId(witnessNodeId);
    }
  }, [selectedWitness, selectedNodeId, mapData.metaMap]);

  const selectedMeta = mapData.metaMap[selectedNodeId] || null;

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return mapData.searchItems
      .filter((item) => item.label.toLowerCase().includes(term) || item.type.toLowerCase().includes(term))
      .slice(0, 8);
  }, [mapData.searchItems, searchTerm]);

  const persistNodePosition = async (nodeId, nodeType, position) => {
    if (!selectedWitnessId) return;
    const existing = positionRecordMap[nodeId];
    const nextPosition = { witness_id: selectedWitnessId, node_id: nodeId, node_type: nodeType, x: position.x, y: position.y };
    setPositionsMap((prev) => ({ ...prev, [nodeId]: nextPosition }));

    if (existing?.id) {
      const updated = await base44.entities.MindMapNodePosition.update(existing.id, nextPosition);
      setPositionRecordMap((prev) => ({ ...prev, [nodeId]: updated }));
    } else {
      const created = await base44.entities.MindMapNodePosition.create(nextPosition);
      setPositionRecordMap((prev) => ({ ...prev, [nodeId]: created }));
    }
  };

  const saveHubState = async (nodeType, nodeId, status) => {
    if (!selectedWitnessId) return;
    const key = `${nodeType}:${nodeId}`;
    const existing = hubRecordMap[key];
    const nextState = { witness_id: selectedWitnessId, node_id: nodeId, node_type: nodeType, status };
    setStateMap((prev) => ({ ...prev, [key]: nextState }));

    if (existing?.id) {
      const updated = await base44.entities.AttorneyHubState.update(existing.id, nextState);
      setHubRecordMap((prev) => ({ ...prev, [key]: updated }));
    } else {
      const created = await base44.entities.AttorneyHubState.create(nextState);
      setHubRecordMap((prev) => ({ ...prev, [key]: created }));
    }
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
    setFocusRequest({ id: `proof-${proof.id}`, ts: Date.now() });
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

  const openProof = (proof) => {
    const url = resolveProofUrl(proof);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSelectNode = (nodeId, nodeType) => {
    setSelectedNodeId(nodeId);
    if (nodeType === 'bucket') {
      setExpandedBucketId(nodeId.replace('bucket-', ''));
    }
    setFocusRequest({ id: nodeId, ts: Date.now() });
  };

  const handleSearchSelect = (result) => {
    setSelectedNodeId(result.id);
    if (result.bucketId) {
      setExpandedBucketId(result.bucketId);
    }
    if (result.id.startsWith('bucket-')) {
      setExpandedBucketId(result.id.replace('bucket-', ''));
    }
    setFocusRequest({ id: result.id, ts: Date.now() });
    setSearchTerm('');
  };

  const handleJumpNextBucket = (bucket) => {
    const siblings = buckets
      .filter((item) => item.party_id === bucket.party_id && (item.trial_point_id || '__unassigned__') === (bucket.trial_point_id || '__unassigned__'))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const currentIndex = siblings.findIndex((item) => item.id === bucket.id);
    const nextBucket = siblings[currentIndex + 1];
    if (!nextBucket) return;
    setExpandedBucketId(nextBucket.id);
    setSelectedNodeId(`bucket-${nextBucket.id}`);
    setFocusRequest({ id: `bucket-${nextBucket.id}`, ts: Date.now() });
  };

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden">
      <div className="flex h-full flex-col">
        <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur shrink-0">
          <div className="grid gap-3 xl:grid-cols-[180px_220px_minmax(240px,1fr)_160px_auto_auto]">
            <select value={selectedSide} onChange={(event) => setSelectedSide(event.target.value)} className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none">
              {sideOptions.map((side) => <option key={side} value={side}>{side}</option>)}
            </select>
            <select value={selectedWitnessId} onChange={(event) => setSelectedWitnessId(event.target.value)} className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none">
              {witnesses.map((witness) => <option key={witness.id} value={witness.id}>{witness.first_name} {witness.last_name}</option>)}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search buckets, questions, proofs" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500" />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
                  {searchResults.map((result) => (
                    <button key={result.id} type="button" onClick={() => handleSearchSelect(result)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-900">
                      <span className="text-sm text-slate-200">{result.label}</span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">{result.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setCompactView((value) => !value)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800">
              {compactView ? <Shrink className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {compactView ? 'Compact View' : 'Expanded View'}
            </button>
            <Button onClick={() => setFitRequestKey((value) => value + 1)} className="h-11 rounded-xl bg-blue-600 px-4 hover:bg-blue-700">Fit to Screen</Button>
            <Button variant="outline" onClick={() => { setExpandedBucketId(null); setFitRequestKey((value) => value + 1); }} className="h-11 rounded-xl border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">Collapse All</Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <MindMapSidebar treeItems={mapData.treeItems} selectedNodeId={selectedNodeId} onSelect={handleSelectNode} />

          <main className="min-w-0 flex-1">
            <ReactFlowProvider>
              <MindMapCanvas
                graphNodes={mapData.nodes}
                graphEdges={mapData.edges}
                fitRequestKey={fitRequestKey}
                focusRequest={focusRequest}
                onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                onExpandBucket={setExpandedBucketId}
                onPersistPosition={persistNodePosition}
              />
            </ReactFlowProvider>
          </main>

          <MindMapDetailsPanel
            selectedMeta={selectedMeta}
            publishedProofId={publishedProofId}
            onStartBucket={(bucketId) => saveHubState('bucket', bucketId, 'active')}
            onMarkBucketDone={(bucketId) => saveHubState('bucket', bucketId, 'done')}
            onMarkBucketSkipped={(bucketId) => saveHubState('bucket', bucketId, 'skipped')}
            onJumpNextBucket={handleJumpNextBucket}
            onMarkQuestionAsked={(questionId) => saveHubState('question', questionId, 'asked')}
            onOpenProof={openProof}
            onPublishProof={publishProof}
            onBlankJury={blankJury}
          />
        </div>
      </div>
    </div>
  );
}

export default function AttorneyHub() {
  return <AttorneyHubContent />;
}