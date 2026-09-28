import type { CSSProperties, ReactNode } from "react";
import type { ConceptAnim, SceneFrame, SceneMotion } from "../conceptVideos";

interface ConceptAnimationProps {
  anim: ConceptAnim;
  // Index of the sentence being spoken in this scene; each beat reveals the
  // next part of the animation. A large number shows the finished picture.
  beat: number;
}

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

function Equation({ children, show = true }: { children: ReactNode; show?: boolean }) {
  return (
    <p
      className={`mt-4 text-center text-2xl font-bold text-indigo-700 transition-opacity duration-500 sm:text-3xl ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </p>
  );
}

function Item({ emoji, className = "anim-pop", style }: { emoji: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={`inline-block text-3xl sm:text-4xl ${className}`} style={style} aria-hidden="true">
      {emoji}
    </span>
  );
}

function Join({ a, b, item, beat }: { a: number; b: number; item: string; beat: number }) {
  const merged = beat >= 2;
  return (
    <div>
      <div className="flex justify-center transition-all duration-700" style={{ gap: merged ? "0.25rem" : "3rem" }}>
        <div className={`flex flex-wrap gap-1 rounded-xl p-2 transition-colors ${merged ? "" : "bg-white/70"}`}>
          {Array.from({ length: a }).map((_, i) => (
            <Item key={i} emoji={item} style={delay(i * 0.2)} />
          ))}
        </div>
        <div className={`flex flex-wrap gap-1 rounded-xl p-2 transition-colors ${merged ? "" : "bg-white/70"}`}>
          {beat >= 1 &&
            Array.from({ length: b }).map((_, i) => <Item key={i} emoji={item} style={delay(i * 0.25)} />)}
        </div>
      </div>
      <Equation>
        {a}
        {beat >= 1 && ` + ${b}`}
        {merged && ` = ${a + b}`}
      </Equation>
    </div>
  );
}

function TakeAway({ total, remove, item, beat }: { total: number; remove: number; item: string; beat: number }) {
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 pt-10">
        {Array.from({ length: total }).map((_, i) => {
          const leaving = i >= total - remove;
          return (
            <Item
              key={i}
              emoji={item}
              className={beat >= 1 && leaving ? "anim-fly" : "anim-pop"}
              style={delay(beat >= 1 && leaving ? (i - (total - remove)) * 0.35 : i * 0.12)}
            />
          );
        })}
      </div>
      <Equation>
        {total}
        {beat >= 1 && ` − ${remove}`}
        {beat >= 2 && ` = ${total - remove}`}
      </Equation>
    </div>
  );
}

function Hops({ start, step, count, direction, beat }: { start: number; step: number; count: number; direction: 1 | -1; beat: number }) {
  const end = start + direction * step * count;
  const lo = Math.max(0, Math.min(start, end) - step);
  const hi = Math.max(start, end) + step;
  const span = hi - lo;
  const W = 600;
  const pad = 30;
  const y = 110;
  const x = (v: number) => pad + ((v - lo) / span) * (W - pad * 2);
  const ticks = Array.from({ length: span + 1 }, (_, i) => lo + i);
  const labelled = (v: number) => (span <= 14 ? true : v % step === 0);
  const hopHeight = Math.min(70, 25 + ((W - pad * 2) / span) * step * 0.35);

  return (
    <div>
      <svg viewBox={`0 0 ${W} 150`} className="mx-auto w-full max-w-xl" role="img" aria-label={`Number line from ${start}, ${count} hops of ${step}`}>
        <line x1={pad - 10} y1={y} x2={W - pad + 10} y2={y} stroke="#334155" strokeWidth={2} />
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={y - (labelled(v) ? 8 : 4)} x2={x(v)} y2={y + (labelled(v) ? 8 : 4)} stroke="#334155" strokeWidth={1.5} />
            {labelled(v) && (
              <text x={x(v)} y={y + 28} textAnchor="middle" fontSize={16} fill="#334155" fontWeight={v === start || (beat >= 2 && v === end) ? 700 : 400}>
                {v}
              </text>
            )}
          </g>
        ))}
        <circle cx={x(start)} cy={y} r={8} fill="#4f46e5" className="anim-pop" />
        {beat >= 1 &&
          Array.from({ length: count }).map((_, i) => {
            const from = start + direction * step * i;
            const to = from + direction * step;
            const mid = (x(from) + x(to)) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${x(from)} ${y - 6} Q ${mid} ${y - hopHeight * 2} ${x(to)} ${y - 6}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  strokeLinecap="round"
                  pathLength={1}
                  className="anim-draw"
                  style={delay(i * 0.7)}
                />
                <text x={mid} y={y - hopHeight - 8} textAnchor="middle" fontSize={14} fontWeight={700} fill="#b45309" className="anim-pop" style={delay(i * 0.7 + 0.4)}>
                  {direction > 0 ? "+" : "−"}
                  {step}
                </text>
              </g>
            );
          })}
        {beat >= 2 && <circle cx={x(end)} cy={y} r={11} fill="#f59e0b" stroke="white" strokeWidth={3} className="anim-pop" />}
      </svg>
      <Equation show={beat >= 2}>
        {/* Skip counting from 0 is a times-table fact, not a sum. */}
        {start === 0 && step > 1 ? `${count} × ${step} = ${end}` : `${start} ${direction > 0 ? "+" : "−"} ${step * count} = ${end}`}
      </Equation>
    </div>
  );
}

function Groups({ groups, each, item, beat }: { groups: number; each: number; item: string; beat: number }) {
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: groups }).map((_, g) => (
          <div key={g} className="flex flex-col items-center gap-1">
            <div className="anim-pop grid grid-cols-2 gap-1 rounded-2xl border-2 border-indigo-300 bg-white p-2 shadow-sm" style={delay(g * 0.5)}>
              {Array.from({ length: each }).map((_, i) => (
                <Item key={i} emoji={item} className="" />
              ))}
            </div>
            {beat >= 1 && (
              <span className="anim-pop rounded-full bg-amber-100 px-3 py-0.5 text-lg font-bold text-amber-800" style={delay(g * 0.6)}>
                {each * (g + 1)}
              </span>
            )}
          </div>
        ))}
      </div>
      <Equation show={beat >= 2}>
        {groups} × {each} = {groups * each}
      </Equation>
    </div>
  );
}

function Share({ total, groups, item, beat }: { total: number; groups: number; item: string; beat: number }) {
  const each = Math.floor(total / groups);
  const left = total % groups;
  const dealt = total - left;
  const dealing = beat >= 1;
  const step = Math.min(0.3, 4 / dealt);

  return (
    <div>
      <div className="mb-3 flex min-h-[3rem] flex-wrap justify-center gap-1 rounded-xl bg-white/60 p-2">
        {Array.from({ length: total }).map((_, i) => (
          <Item key={i} emoji={item} className={dealing && i < dealt ? "anim-vanish" : ""} style={delay(i * step)} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: groups }).map((_, p) => (
          <div key={p} className="flex flex-col items-center gap-1">
            <span className="text-3xl" aria-hidden="true">
              🧒
            </span>
            <div className="flex min-h-[2.75rem] min-w-[4.5rem] flex-wrap justify-center gap-0.5 rounded-full border-2 border-indigo-200 bg-white px-2 py-1">
              {dealing &&
                Array.from({ length: each }).map((_, j) => (
                  <span key={j} className="anim-pop text-xl" style={delay((j * groups + p) * step)} aria-hidden="true">
                    {item}
                  </span>
                ))}
            </div>
            {beat >= 2 && <span className="anim-pop text-sm font-bold text-amber-800">{each} each</span>}
          </div>
        ))}
      </div>
      <Equation show={beat >= 2}>
        {total} ÷ {groups} = {each}
        {left > 0 && <span className="text-amber-600"> remainder {left}</span>}
      </Equation>
    </div>
  );
}

function Table({ n, upto, beat }: { n: number; upto: number; beat: number }) {
  const rows = beat >= 1 ? upto : 1;
  return (
    <div className="mx-auto max-w-md space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => {
        const k = i + 1;
        return (
          <div key={k} className="anim-pop flex items-center gap-3" style={delay(beat >= 1 ? Math.max(0, i - 1) * 0.6 : 0)}>
            <span className="w-24 shrink-0 text-right text-lg font-semibold text-slate-700">
              {n} × {k} =
            </span>
            <span
              className={`w-12 shrink-0 rounded-lg text-center text-xl font-bold ${
                beat >= 2 ? "anim-glow bg-amber-100 text-amber-800" : "text-indigo-700"
              }`}
            >
              {n * k}
            </span>
            <span className="flex flex-wrap gap-0.5" aria-hidden="true">
              {Array.from({ length: k }).map((_, j) => (
                <span key={j} className="rounded bg-indigo-500 px-1.5 text-xs font-bold leading-5 text-white">
                  {n}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Area({ w, h, show, beat }: { w: number; h: number; show: "area" | "perimeter"; beat: number }) {
  const cell = 44;
  const filling = show === "area" && beat >= 1;
  const tracing = show === "perimeter" && beat >= 1;
  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        <span className={`text-sm font-bold text-slate-700 transition-opacity ${show === "area" || tracing ? "opacity-100" : "opacity-0"}`}>
          {h} cm
        </span>
        <div>
          <p className={`mb-1 text-center text-sm font-bold text-slate-700 transition-opacity ${show === "area" || tracing ? "opacity-100" : "opacity-0"}`}>
            {w} cm
          </p>
          <div className="relative" style={{ width: w * cell, height: h * cell }}>
            <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}>
              {Array.from({ length: w * h }).map((_, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-center border border-slate-300 text-sm font-bold ${
                    filling ? "anim-fill text-emerald-900" : "bg-white text-transparent"
                  }`}
                  style={filling ? delay(i * Math.min(0.2, 3 / (w * h))) : undefined}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {tracing && (
              <svg className="pointer-events-none absolute inset-0 overflow-visible" width={w * cell} height={h * cell} aria-hidden="true">
                <rect x={0} y={0} width={w * cell} height={h * cell} fill="none" stroke="#f59e0b" strokeWidth={6} strokeLinejoin="round" pathLength={1} className="anim-draw-slow" />
              </svg>
            )}
          </div>
        </div>
      </div>
      <Equation show={beat >= 2}>
        {show === "area" ? `${w} × ${h} = ${w * h} sq cm` : `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm`}
      </Equation>
    </div>
  );
}

function Column({ a, b, op, beat }: { a: number; b: number; op: "+" | "-" | "×"; beat: number }) {
  const a1 = a % 10;
  const a10 = Math.floor(a / 10);
  const b1 = b % 10;
  const b10 = Math.floor(b / 10);
  let ones: number;
  let tens: number;
  let carry = 0;
  let borrow = false;
  if (op === "+") {
    ones = (a1 + b1) % 10;
    carry = Math.floor((a1 + b1) / 10);
    tens = a10 + b10 + carry;
  } else if (op === "-") {
    borrow = a1 < b1;
    ones = (borrow ? a1 + 10 : a1) - b1;
    tens = a10 - (borrow ? 1 : 0) - b10;
  } else {
    ones = (a1 * b) % 10;
    carry = Math.floor((a1 * b) / 10);
    tens = a10 * b + carry;
  }
  const onesOn = beat >= 1;
  const tensOn = beat >= 2;
  const cellBase = "flex h-12 w-14 items-center justify-center rounded-lg text-3xl font-bold transition-colors duration-500";
  const onesCol = onesOn && !tensOn ? "bg-amber-100" : "";
  const tensCol = tensOn ? "bg-amber-100" : "";
  const symbol = op === "-" ? "−" : op;

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-3 gap-x-1 text-slate-800">
        <span />
        <span className="text-center text-xs font-semibold uppercase text-slate-500">Tens</span>
        <span className="text-center text-xs font-semibold uppercase text-slate-500">Ones</span>

        <span className="h-7" />
        <span className="flex h-7 items-center justify-center text-lg font-bold text-rose-600">
          {onesOn && carry > 0 && <span className="anim-pop">{carry}</span>}
          {onesOn && borrow && <span className="anim-pop">{a10 - 1}</span>}
        </span>
        <span className="flex h-7 items-center justify-center text-lg font-bold text-rose-600">
          {onesOn && borrow && <span className="anim-pop">{a1 + 10}</span>}
        </span>

        <span className={cellBase} />
        <span className={`${cellBase} ${tensCol}`}>
          <span className={onesOn && borrow ? "text-slate-400 line-through" : ""}>{a10}</span>
        </span>
        <span className={`${cellBase} ${onesCol}`}>
          <span className={onesOn && borrow ? "text-slate-400 line-through" : ""}>{a1}</span>
        </span>

        <span className={`${cellBase} text-indigo-600`}>{symbol}</span>
        <span className={`${cellBase} ${tensCol}`}>{b10 > 0 ? b10 : ""}</span>
        <span className={`${cellBase} ${onesCol}`}>{b1}</span>

        <span className="col-span-3 my-1 h-1 rounded bg-slate-700" />

        <span className={cellBase} />
        <span className={`${cellBase} ${tensCol} text-indigo-700`}>{tensOn && <span className="anim-pop">{tens}</span>}</span>
        <span className={`${cellBase} ${onesCol} text-indigo-700`}>{onesOn && <span className="anim-pop">{ones}</span>}</span>
      </div>
    </div>
  );
}

const MOTION_CLASS: Record<SceneMotion, string> = {
  grow: "anim-pop",
  float: "anim-pop kid-float",
  pulse: "anim-pop anim-beat",
  rise: "anim-rise",
  fall: "anim-fall",
  push: "anim-pop",
  pull: "anim-pop",
  chain: "anim-pop",
};

function Scene({ frames, beat }: { frames: SceneFrame[]; beat: number }) {
  const index = Math.min(beat, frames.length - 1);
  const frame = frames[index];
  const stagger = frame.motion === "chain" ? 0.45 : 0.18;
  const mover = frame.motion === "push" ? "anim-push" : frame.motion === "pull" ? "anim-pull" : "";

  return (
    <div key={index} className="scene-in flex flex-col items-center">
      <div className={`flex flex-wrap items-center justify-center gap-3 ${mover}`}>
        {frame.items.map((token, i) => {
          const isText = /^[\w<>=.]+( [\w]+)?$/.test(token);
          return (
            <span
              key={i}
              className={`inline-block ${MOTION_CLASS[frame.motion]} ${
                isText ? "text-4xl font-bold text-indigo-700 sm:text-5xl" : "text-5xl sm:text-6xl"
              }`}
              style={{ animationDelay: `${i * stagger}s`, animationDuration: frame.motion === "float" ? `${2.2 + i * 0.4}s` : undefined }}
              aria-hidden="true"
            >
              {token}
            </span>
          );
        })}
      </div>
      {frame.caption && (
        <p className="anim-pop mt-4 rounded-full bg-white px-4 py-1 text-base font-semibold text-slate-700 shadow-sm" style={delay(0.3)}>
          {frame.caption}
        </p>
      )}
    </div>
  );
}

export default function ConceptAnimation({ anim, beat }: ConceptAnimationProps) {
  switch (anim.kind) {
    case "join":
      return <Join {...anim} beat={beat} />;
    case "takeaway":
      return <TakeAway {...anim} beat={beat} />;
    case "hops":
      return <Hops {...anim} beat={beat} />;
    case "groups":
      return <Groups {...anim} beat={beat} />;
    case "share":
      return <Share {...anim} beat={beat} />;
    case "table":
      return <Table {...anim} beat={beat} />;
    case "area":
      return <Area {...anim} beat={beat} />;
    case "column":
      return <Column {...anim} beat={beat} />;
    case "scene":
      return <Scene frames={anim.frames} beat={beat} />;
  }
}
