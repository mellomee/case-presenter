import React from 'react';
import MindNodeFrame from './MindNodeFrame.jsx';

export default function EvidenceBlockNode({ data, selected }) {
  return (
    <MindNodeFrame
      title={data.title}
      subtitle={data.subtitle}
      badges={data.badges}
      meta={data.meta}
      accent={data.accent}
      selected={selected}
      compact={data.compact}
    />
  );
}