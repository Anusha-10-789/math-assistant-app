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

// A written column sum: param3 picks the operation (1 +, 2 −, 3 ×).
function ColumnVisual({ param1, param2, param3 }: { param1: number; param2: number; param3: number }) {
  const op = param3 === 2 ? "−" : param3 === 3 ? "×" : "+";
  const result = param3 === 2 ? param1 - param2 : param3 === 3 ? param1 * param2 : param1 + param2;
  const format = (n: number) => (n >= 1000 ? n.toLocaleString("en-IN") : String(n));
  const rows = [format(param1), format(param2), format(result)];
  const width = Math.max(...rows.map((r) => r.length)) * 16 + 40;
  const right = width - 10;

  return (
    <svg viewBox={`0 0 ${width} 112`} className="mx-auto h-28 w-auto max-w-full" role="img" aria-label={`${rows[0]} ${op} ${rows[1]} = ${rows[2]}`}>
      <g fontFamily="ui-monospace, monospace" fontSize={24} fontWeight={700} textAnchor="end">
        <text x={right} y={28} fill="#1e293b">{rows[0]}</text>
        <text x={14} y={60} fill={INDIGO} textAnchor="start">{op}</text>
        <text x={right} y={60} fill="#1e293b">{rows[1]}</text>
        <line x1={8} y1={72} x2={right + 4} y2={72} stroke="#1e293b" strokeWidth={2.5} />
        <text x={right} y={102} fill="#059669">{rows[2]}</text>
      </g>
    </svg>
  );
}

// A rectangle with its length and breadth marked; param3 = 1 draws the unit-square grid.
function RectangleVisual({ param1, param2, param3, unit }: { param1: number; param2: number; param3: number; unit: string }) {
  const long = Math.max(param1, 1);
  const short = Math.max(param2, 1);
  const w = 200;
  const h = Math.max(50, Math.min(150, (short / long) * w));
  const x = 40;
  const y = 22;
  const cols = param3 === 1 ? Math.min(param1, 12) : 0;
  const rows = param3 === 1 ? Math.min(param2, 12) : 0;
  const suffix = unit ? ` ${unit}` : "";

  return (
    <svg viewBox={`0 0 ${w + 60} ${h + 44}`} className="mx-auto h-36 w-full max-w-xs" role="img" aria-label={`rectangle ${param1} by ${param2}`}>
      <rect x={x} y={y} width={w} height={h} fill="#fef3c7" stroke={AMBER} strokeWidth={2.5} rx={3} />
      {Array.from({ length: Math.max(cols - 1, 0) }).map((_, i) => (
        <line key={`c${i}`} x1={x + ((i + 1) * w) / cols} y1={y} x2={x + ((i + 1) * w) / cols} y2={y + h} stroke={AMBER} strokeWidth={1} />
      ))}
      {Array.from({ length: Math.max(rows - 1, 0) }).map((_, i) => (
        <line key={`r${i}`} x1={x} y1={y + ((i + 1) * h) / rows} x2={x + w} y2={y + ((i + 1) * h) / rows} stroke={AMBER} strokeWidth={1} />
      ))}
      {param3 !== 1 && (
        <>
          <text x={x + w / 2} y={14} fontSize={13} fontWeight={700} textAnchor="middle" fill="#334155">
            {param1}{suffix}
          </text>
          <text x={x - 6} y={y + h / 2 + 4} fontSize={13} fontWeight={700} textAnchor="end" fill="#334155">
            {param2}{suffix}
          </text>
        </>
      )}
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
  } else if (visual.type === "column") {
    content = <ColumnVisual param1={visual.param1} param2={visual.param2} param3={visual.param3} />;
  } else if (visual.type === "rectangle") {
    content = <RectangleVisual param1={visual.param1} param2={visual.param2} param3={visual.param3} unit={visual.label} />;
  }

  if (!content) return null;

  return (
    <div className="my-2 flex flex-col items-center gap-1">
      {content}
      {visual.label && visual.type !== "rectangle" && <span className="text-xs font-medium text-slate-500">{visual.label}</span>}
    </div>
  );
}
