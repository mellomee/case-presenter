import React, { useEffect } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MapNode from './MapNode.jsx';

const nodeTypes = { mapNode: MapNode };

function CanvasInner({ nodes: graphNodes, edges: graphEdges, fitRequestKey, focusNodeId, onSelectNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);
  const reactFlow = useReactFlow();

  useEffect(() => {
    setNodes(graphNodes);
  }, [graphNodes, setNodes]);

  useEffect(() => {
    setEdges(graphEdges.map((edge) => ({
      ...edge,
      type: edge.type || 'smoothstep',
      markerEnd: edge.markerEnd || { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: edge.style || { stroke: '#334155', strokeWidth: 1.5 },
    })));
  }, [graphEdges, setEdges]);

  useEffect(() => {
    if (!nodes.length || !fitRequestKey) return;
    requestAnimationFrame(() => reactFlow.fitView({ padding: 0.2, duration: 300 }));
  }, [fitRequestKey, nodes.length, reactFlow]);

  useEffect(() => {
    if (!focusNodeId) return;
    requestAnimationFrame(() => reactFlow.fitView({ nodes: [{ id: focusNodeId }], padding: 0.9, duration: 300, maxZoom: 1.2 }));
  }, [focusNodeId, reactFlow]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      fitView
      minZoom={0.35}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      className="bg-slate-950"
    >
      <Background color="#1e293b" gap={22} size={1} />
      <Controls className="!border !border-slate-700 !bg-slate-900 !text-white" showInteractive={false} />
    </ReactFlow>
  );
}

export default function AttorneyMapCanvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}