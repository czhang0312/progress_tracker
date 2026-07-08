'use client';

import { useState } from 'react';
import { T } from '@/lib/theme';

// The app's one progress-circle spec, used everywhere a status circle
// appears (table cells, legend, goal pills, logo mark):
//   - 2px stroke at every size
//   - status 0 → neutral ring, 1 → accent half fill (always 135°), 2 → solid
//     accent disc with a white check
//   - ~200ms fill transition, small pop on click

const K = Math.SQRT1_2; // cos/sin 45° — endpoints of the 135° split line

function halfPath(size: number) {
  const c = size / 2;
  const r = (size - 2) / 2;
  const ax = c + r * K, ay = c - r * K; // top-right point
  const bx = c - r * K, by = c + r * K; // bottom-left point
  // Counter-clockwise arc from top-right to bottom-left = top-left half disc,
  // matching the old `linear-gradient(135deg, …)` fill direction.
  return `M ${ax} ${ay} A ${r} ${r} 0 0 0 ${bx} ${by} Z`;
}

export default function ProgressCircle({
  status,
  size,
  onClick,
  isFuture = false,
}: {
  status: number;
  size: number;
  onClick?: () => void;
  isFuture?: boolean;
}) {
  const [pop, setPop] = useState(false);
  const interactive = !!onClick && !isFuture;

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!interactive) return;
    setPop(true);
    setTimeout(() => setPop(false), 200);
    onClick!();
  };

  const c = size / 2;
  const r = (size - 2) / 2;
  const checkStroke = Math.max(1.5, size * 0.08);

  return (
    <div
      onClick={onClick ? handleClick : undefined}
      style={{
        width: size,
        height: size,
        margin: onClick ? '0 auto' : undefined,
        cursor: interactive ? 'pointer' : 'default',
        opacity: isFuture ? 0.25 : 1,
        display: 'inline-flex',
        flexShrink: 0,
        transform: pop ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform .18s cubic-bezier(.34,1.56,.64,1)',
      }}
    >
      <svg width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill={status === 2 ? T.accent : 'transparent'}
          stroke={status === 0 ? T.ringEmpty : T.accent}
          strokeWidth={2}
          style={{ transition: 'fill .2s ease-out, stroke .2s ease-out' }}
        />
        <path
          d={halfPath(size)}
          fill={T.accent}
          opacity={status === 1 ? 1 : 0}
          style={{ transition: 'opacity .2s ease-out' }}
        />
        <path
          d={`M ${size * 0.3} ${size * 0.53} L ${size * 0.44} ${size * 0.67} L ${size * 0.7} ${size * 0.36}`}
          fill="none"
          stroke="#fff"
          strokeWidth={checkStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={status === 2 ? 1 : 0}
          style={{ transition: 'opacity .2s ease-out' }}
        />
      </svg>
    </div>
  );
}

// Brand mark — the half-filled circle, same spec as a status-1 circle.
export function LogoMark({ size }: { size: number }) {
  return <ProgressCircle status={1} size={size} />;
}
