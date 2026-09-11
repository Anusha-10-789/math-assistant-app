import type { ReactNode } from "react";
import type { VisualAidData } from "../types";

interface VisualAidProps {
  visual: VisualAidData;
}

const INDIGO = "#4f46e5";
const AMBER = "#f59e0b";
const SLATE = "#cbd5e1";

function GroupsVisual({ param1, param2 }: { param1: number; param2: number }) {
  const groups = Math.min(Math.max(param1, 0), 8);
  const perGroup = Math.min(Math.max(param2, 0), 12);
  const dotsPerRow = 4;
  const dotR = 5;
  const dotGap = 14;
  const groupPadding = 10;
  const groupCols = Math.min(perGroup, dotsPerRow);
  const groupRows = Math.max(1, Math.ceil(perGroup / dotsPerRow));
  const groupWidth = groupCols * dotGap + groupPadding * 2 - (dotGap - dotR * 2);
  const groupHeight = groupRows * dotGap + groupPadding * 2 - (dotGap - dotR * 2);
  const groupGap = 12;
  const totalWidth = groups * groupWidth + Math.max(groups - 1, 0) * groupGap;

  return (
    <svg
      viewBox={`0 0 ${Math.max(totalWidth, 40)} ${groupHeight + 10}`}
      className="mx-auto h-24 w-full max-w-md"
      role="img"
      aria-label={`${param1} groups of ${param2}`}
    >
      {Array.from({ length: groups }).map((_, g) => (
        <g key={g} transform={`translate(${g * (groupWidth + groupGap)}, 5)`}>
          <rect
            width={groupWidth}
            height={groupHeight}
            rx={10}
            fill="white"
            stroke={INDIGO}
            strokeWidth={1.5}
            opacity={0.9}
          />
          {Array.from({ length: perGroup }).map((_, i) => (
            <circle
              key={i}
              cx={groupPadding + (i % dotsPerRow) * dotGap}
              cy={groupPadding + Math.floor(i / dotsPerRow) * dotGap}
              r={dotR}
              fill={INDIGO}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function NumberLineVisual({ param1, param2 }: { param1: number; param2: number }) {
  const lo = Math.min(param1, param2);
  const hi = Math.max(param1, param2);
  const rangeStart = Math.max(0, lo - 1);
  const rangeEnd = hi + 1;
  const span = Math.max(rangeEnd - rangeStart, 1);
  const width = 320;
  const marginX = 20;
  const usableWidth = width - marginX * 2;
  const scale = (value: number) => marginX + ((value - rangeStart) / span) * usableWidth;

  const ticks: number[] = [];
  if (span <= 20) {
    for (let v = rangeStart; v <= rangeEnd; v += 1) ticks.push(v);
  } else {
    ticks.push(rangeStart, lo, hi, rangeEnd);
  }

  const x1 = scale(param1);
  const x2 = scale(param2);
  const arcTop = 34;

  return (
    <svg viewBox={`0 0 ${width} 70`} className="mx-auto h-20 w-full max-w-md" role="img" aria-label={`from ${param1} to ${param2}`}>
      <line x1={marginX} y1={50} x2={width - marginX} y2={50} stroke={SLATE} strokeWidth={2} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={scale(t)} y1={45} x2={scale(t)} y2={55} stroke={SLATE} strokeWidth={2} />
          <text x={scale(t)} y={68} fontSize={10} textAnchor="middle" fill="#64748b">
            {t}
          </text>
        </g>
      ))}
      <path
        d={`M ${x1} 50 Q ${(x1 + x2) / 2} ${arcTop} ${x2} 50`}
        fill="none"
        stroke={AMBER}
        strokeWidth={2.5}
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={AMBER} />
        </marker>
      </defs>
      <circle cx={x1} cy={50} r={4} fill={INDIGO} />
      <circle cx={x2} cy={50} r={4} fill={INDIGO} />
    </svg>
  );
}

function PieVisual({ param1, param2 }: { param1: number; param2: number }) {
  const total = Math.min(Math.max(param1, 1), 12);
  const shaded = Math.min(Math.max(param2, 0), total);
  const cx = 40;
  const cy = 40;
  const r = 32;

  const slices = Array.from({ length: total }).map((_, i) => {
    const startAngle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { path, filled: i < shaded };
  });

  return (
    <svg viewBox="0 0 80 80" className="mx-auto h-24 w-24" role="img" aria-label={`${param2} of ${param1} shaded`}>
      {slices.map((slice, i) => (
        <path key={i} d={slice.path} fill={slice.filled ? INDIGO : "white"} stroke={SLATE} strokeWidth={1} />
      ))}
    </svg>
  );
}

export default function VisualAid({ visual }: VisualAidProps) {
  if (!visual || visual.type === "none") return null;

  let content: ReactNode = null;
  if (visual.type === "groups") {
    content = <GroupsVisual param1={visual.param1} param2={visual.param2} />;
  } else if (visual.type === "number_line") {
    content = <NumberLineVisual param1={visual.param1} param2={visual.param2} />;
  } else if (visual.type === "pie") {
    content = <PieVisual param1={visual.param1} param2={visual.param2} />;
  }

  if (!content) return null;

  return (
    <div className="my-2 flex flex-col items-center gap-1">
      {content}
      {visual.label && <span className="text-xs font-medium text-slate-500">{visual.label}</span>}
    </div>
  );
}
