import React from 'react';
import MindNodeFrame from './MindNodeFrame.jsx';

export default function BucketNode({ data, selected }) {
  return (
    <MindNodeFrame
      title={data.title}
      subtitle={data.subtitle}
      badges={data.badges}
      meta={data.meta}
      accent={data.accent}
      filled
      circle
      selected={selected}
      compact={data.compact}
    />
  );
}