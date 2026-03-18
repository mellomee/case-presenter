import React, { useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function NodeBadge({ badge }) {
  const toneClass = {
    slate: 'bg-slate-800 text-slate-300 border border-slate-700',
    blue: 'bg-blue-500/15 text-blue-300 border border-blue-400/30',
    green: 'bg-green-500/15 text-green-300 border border-green-400/30',
    amber: 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-400/30',
    red: 'bg-red-500/15 text-red-300 border border-red-400/30',
  };

  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClass[badge.tone] || toneClass.slate}`}>{badge.label}</span>;
}

function BaseNode({ data, className }) {
  return (
    <div className={`min-w-[180px] rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${className} ${data.selected ? 'ring-2 ring-blue-400/70' : ''}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-slate-500" />
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold text-white">{data.title}</p>
          {data.subtitle && <p className="mt-1 text-xs text-slate-300">{data.subtitle}</p>}
        </div>
        {data.metrics?.length > 0 && <div className="flex flex-wrap gap-1 text-[11px] text-slate-300">{data.metrics.map((metric) => <span key={metric}>{metric}</span>)}</div>}
        {data.badges?.length > 0 && <div className="flex flex-wrap gap-1">{data.badges.map((badge) => <NodeBadge key={badge.label} badge={badge} />)}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-slate-500" />
    </div>
  );
}

function WitnessNode(props) {
  return <BaseNode {...props} className="border-indigo-400/40 bg-indigo-500/15" />;
}

function TrialPointNode(props) {
  return <BaseNode {...props} className="border-cyan-400/40 bg-cyan-500/15" />;
}

function BucketNode(props) {
  return <BaseNode {...props} className="border-slate-600 bg-slate-900/95" />;
}

function QuestionNode(props) {
  return <BaseNode {...props} className="border-blue-400/30 bg-blue-500/10" />;
}

function EvidenceBlockNode(props) {
  return <BaseNode {...props} className="border-amber-400/40 bg-amber-500/10" />;
}

function ProofNode(props) {
  return <BaseNode {...props} className="border-emerald-400/40 bg-emerald-500/10" />;
}

const nodeTypes = {
  witness: WitnessNode,
  trialPoint: TrialPointNode,
  bucket: BucketNode,
  question: QuestionNode,
  evidenceBlock: EvidenceBlockNode,
  proof: ProofNode,
};

function CanvasInner({
  graphNodes,
  graphEdges,
  focusRequest,
  fitRequestKey,
  onSelectNode,
  onExpandBucket,
  onPersistPosition,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);
  const reactFlow = useReactFlow();

  useEffect(() => {
    setNodes(graphNodes);
  }, [graphNodes, setNodes]);

  useEffect(() => {
    setEdges(graphEdges.map((edge) => ({
      ...edge,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
      style: { stroke: '#334155', strokeWidth: 1.5 },
    })));
  }, [graphEdges, setEdges]);

  useEffect(() => {
    if (!nodes.length || !fitRequestKey) return;
    requestAnimationFrame(() => {
      reactFlow.fitView({ padding: 0.18, duration: 350 });
    });
  }, [fitRequestKey, nodes.length, reactFlow]);

  useEffect(() => {
    if (!focusRequest?.id) return;
    requestAnimationFrame(() => {
      reactFlow.fitView({ nodes: [{ id: focusRequest.id }], padding: 0.9, duration: 350, maxZoom: 1.25 });
    });
  }, [focusRequest, reactFlow]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => {
        onSelectNode(node.id);
        if (node.type === 'bucket') onExpandBucket(node.id.replace('bucket-', ''));
        if (node.data?.bucketId) onExpandBucket(node.data.bucketId);
      }}
      onNodeDragStop={(_, node) => onPersistPosition(node.id, node.type, node.position)}
      fitView
      minZoom={0.25}
      maxZoom={1.8}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      proOptions={{ hideAttribution: true }}
      className="bg-slate-950"
    >
      <Background color="#1e293b" gap={22} size={1} />
      <Controls className="!border !border-slate-700 !bg-slate-900 !text-white" showInteractive={false} />
    </ReactFlow>
  );
}

export default function MindMapCanvas(props) {
  const memoProps = useMemo(() => props, [props]);
  return <CanvasInner {...memoProps} />;
}