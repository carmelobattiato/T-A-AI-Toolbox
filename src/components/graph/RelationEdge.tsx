import React from 'react';
import { EdgeProps, getBezierPath } from '@xyflow/react';

export const RelationEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeType = (data?.type as string) || 'TOOL';
  const isHighlighted = !!data?.isHighlighted;
  const isDimmed = !!data?.isDimmed;
  const isMultiPhaseSecondary = !!data?.isMultiPhaseSecondary;

  let strokeColor = '#3B82F6'; // Blue
  if (edgeType === 'IDEA') strokeColor = '#A855F7'; // Purple
  if (edgeType === 'NEED') strokeColor = '#22C55E'; // Green

  let opacity = 0.35;
  let strokeWidth = 1.5;

  if (isHighlighted) {
    opacity = 1.0;
    strokeWidth = 2.5;
  } else if (isMultiPhaseSecondary) {
    opacity = 0.3;
    strokeWidth = 1.5;
  } else if (isDimmed) {
    opacity = 0.08;
    strokeWidth = 1;
  }

  return (
    <g className="flow-edge-transition">
      {/* Invisible wider path for easier clicking or hovering if needed */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        className="pointer-events-none"
      />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeLinecap="round"
        strokeDasharray={edgeType === 'IDEA' ? '5 4' : undefined}
      />
    </g>
  );
};
