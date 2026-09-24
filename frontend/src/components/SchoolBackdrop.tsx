import { useRef, useState } from "react";

// A cheerful school scene behind the login screens: sky, sun and clouds, a
// schoolhouse, trees, children with school bags, floating ABC / 123 and
// balloons. Children can play with it while they log in — pop the balloons,
// ring the school bell, spin the sun, make the children jump. Drawn inline so
// it needs no image files.

type Toy = "sun" | "bell" | `kid${number}` | `letter${number}`;

let audioContext: AudioContext | null = null;

// A tiny "boop" for taps, made with the Web Audio API — no sound files.
function playTone(frequency: number, duration = 0.15) {
  try {
    audioContext ??= new AudioContext();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.8, audioContext.currentTime + duration);
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch {
    // Sound is only a bonus.
  }
}

interface KidProps {
  x: number;
  shirt: string;
  bag: string;
  skin: string;
  hair: string;
  flip?: boolean;
  jumping: boolean;
  onTap: () => void;
}

function Kid({ x, shirt, bag, skin, hair, flip = false, jumping, onTap }: KidProps) {
  return (
    <g transform={`translate(${x} 612)`} className="pointer-events-auto cursor-pointer" onClick={onTap}>
      <g className={jumping ? "kid-jump" : undefined}>
        <g transform={`scale(${flip ? -1 : 1} 1)`}>
          <rect x={-17} y={-58} width={12} height={34} rx={5} fill={bag} />
          <rect x={-8} y={-2} width={6} height={30} rx={3} fill="#334155" />
          <rect x={3} y={-2} width={6} height={30} rx={3} fill="#334155" />
          <path d="M -12 0 Q -12 -52 0 -54 Q 12 -52 12 0 Z" fill={shirt} />
          <circle cx={0} cy={-68} r={15} fill={skin} />
          <path d="M -15 -70 Q -14 -86 0 -86 Q 14 -86 15 -70 Q 8 -78 0 -77 Q -8 -78 -15 -70 Z" fill={hair} />
          <circle cx={-5} cy={-68} r={1.8} fill="#1e293b" />
          <circle cx={5} cy={-68} r={1.8} fill="#1e293b" />
          <path d="M -5 -61 Q 0 -57 5 -61" stroke="#1e293b" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d={jumping ? "M 11 -44 L 22 -66" : "M 11 -40 L 22 -24"} stroke={skin} strokeWidth={5} strokeLinecap="round" />
        </g>
        {jumping && (
          <g transform="translate(0 -118)">
            <rect x={-24} y={-16} width={48} height={26} rx={10} fill="white" stroke="#6366f1" strokeWidth={2} />
            <text y={3} fontSize={15} fontWeight={800} textAnchor="middle" fill="#4f46e5">
              Hi!
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

function Tree({ x, scale = 1 }: { x: number; scale?: number }) {
  return (
    <g transform={`translate(${x} 600) scale(${scale})`}>
      <rect x={-8} y={-60} width={16} height={60} fill="#92400e" rx={3} />
      <circle cx={0} cy={-80} r={38} fill="#22c55e" />
      <circle cx={-26} cy={-62} r={26} fill="#16a34a" />
      <circle cx={26} cy={-62} r={26} fill="#16a34a" />
      <circle cx={-10} cy={-92} r={5} fill="#ef4444" />
      <circle cx={16} cy={-74} r={5} fill="#ef4444" />
    </g>
  );
}

function Cloud({ x, y, scale, duration }: { x: number; y: number; scale: number; duration: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="kid-float" style={{ animationDuration: duration }}>
        <ellipse cx={0} cy={0} rx={46} ry={22} fill="white" />
        <ellipse cx={-30} cy={8} rx={30} ry={17} fill="white" />
        <ellipse cx={32} cy={8} rx={32} ry={18} fill="white" />
      </g>
    </g>
  );
}

const FLOATERS: Array<{ text: string; x: number; y: number; color: string; size: number; duration: string }> = [
  { text: "A", x: 90, y: 250, color: "#f97316", size: 54, duration: "5s" },
  { text: "B", x: 175, y: 330, color: "#8b5cf6", size: 44, duration: "6.5s" },
  { text: "C", x: 70, y: 400, color: "#06b6d4", size: 40, duration: "5.8s" },
  { text: "1", x: 1110, y: 250, color: "#ec4899", size: 54, duration: "6s" },
  { text: "2", x: 1030, y: 335, color: "#22c55e", size: 44, duration: "5.2s" },
  { text: "3", x: 1140, y: 405, color: "#eab308", size: 40, duration: "7s" },
  { text: "+", x: 400, y: 120, color: "#0ea5e9", size: 38, duration: "4.8s" },
];

const BALLOONS: Array<{ x: number; y: number; color: string; duration: string }> = [
  { x: 300, y: 290, color: "#f43f5e", duration: "4.5s" },
  { x: 232, y: 450, color: "#8b5cf6", duration: "5.5s" },
  { x: 985, y: 215, color: "#22c55e", duration: "5s" },
  { x: 700, y: 85, color: "#f59e0b", duration: "6s" },
];

const KIDS = [
  { x: 212, shirt: "#f97316", bag: "#2563eb", skin: "#d6a07a", hair: "#1f2937" },
  { x: 258, shirt: "#a855f7", bag: "#f43f5e", skin: "#c68b62", hair: "#111827" },
  { x: 1060, shirt: "#0ea5e9", bag: "#facc15", skin: "#b97d57", hair: "#1f2937", flip: true },
];

export default function SchoolBackdrop() {
  const [active, setActive] = useState<Set<Toy>>(new Set());
  const [popped, setPopped] = useState<Set<number>>(new Set());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Starts a toy's animation, then switches it off again after `ms`.
  function play(toy: Toy, ms: number, tone: number) {
    playTone(tone);
    setActive((prev) => new Set(prev).add(toy));
    clearTimeout(timers.current[toy]);
    timers.current[toy] = setTimeout(() => {
      setActive((prev) => {
        const next = new Set(prev);
        next.delete(toy);
        return next;
      });
    }, ms);
  }

  function popBalloon(index: number) {
    if (popped.has(index)) return;
    playTone(900, 0.08);
    setPopped((prev) => new Set(prev).add(index));
    // A fresh balloon floats back a moment later.
    setTimeout(() => {
      setPopped((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 2500);
  }

  return (
    <svg
      className="pointer-events-none fixed inset-0 h-full w-full select-none"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="school-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>

      <rect width="1200" height="700" fill="url(#school-sky)" />

      {/* sun — tap to spin */}
      <g transform="translate(1060 90)" className="pointer-events-auto cursor-pointer" onClick={() => play("sun", 1000, 520)}>
        <g className={active.has("sun") ? "kid-spin" : undefined}>
          <g className="kid-twinkle" style={{ animationDuration: "3s" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1={0} y1={-62} x2={0} y2={-78} stroke="#fbbf24" strokeWidth={5} strokeLinecap="round" transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <circle r={48} fill="#fde047" />
          <circle cx={-15} cy={-6} r={4} fill="#92400e" />
          <circle cx={15} cy={-6} r={4} fill="#92400e" />
          <path d={active.has("sun") ? "M -18 10 Q 0 34 18 10 Z" : "M -16 12 Q 0 26 16 12"} stroke="#92400e" strokeWidth={4} fill={active.has("sun") ? "#92400e" : "none"} strokeLinecap="round" />
        </g>
      </g>

      <Cloud x={160} y={90} scale={1.1} duration="7s" />
      <Cloud x={520} y={60} scale={0.8} duration="9s" />
      <Cloud x={820} y={120} scale={1} duration="8s" />

      {/* letters and numbers — tap to spin */}
      {FLOATERS.map((f, i) => {
        const toy: Toy = `letter${i}`;
        return (
          <g key={f.text + f.x} transform={`translate(${f.x} ${f.y})`} className="pointer-events-auto cursor-pointer" onClick={() => play(toy, 700, 400 + i * 60)}>
            <g className="kid-float" style={{ animationDuration: f.duration }}>
              <text
                className={active.has(toy) ? "kid-spin" : undefined}
                fontSize={f.size}
                fontWeight={900}
                fontFamily="'Comic Sans MS', 'Chalkboard SE', 'Trebuchet MS', sans-serif"
                fill={f.color}
                stroke="white"
                strokeWidth={3}
                paintOrder="stroke"
                textAnchor="middle"
              >
                {f.text}
              </text>
            </g>
          </g>
        );
      })}

      {/* balloons — tap to pop */}
      {BALLOONS.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y})`}>
          {popped.has(i) ? (
            <g className="balloon-pop">
              <text fontSize={22} fontWeight={900} textAnchor="middle" fill={b.color} stroke="white" strokeWidth={3} paintOrder="stroke">
                POP!
              </text>
              {Array.from({ length: 8 }).map((_, k) => (
                <circle key={k} cx={Math.cos((k * Math.PI) / 4) * 30} cy={Math.sin((k * Math.PI) / 4) * 30 - 8} r={4} fill={b.color} />
              ))}
            </g>
          ) : (
            <g className="kid-float pointer-events-auto cursor-pointer" style={{ animationDuration: b.duration }} onClick={() => popBalloon(i)}>
              <path d="M 0 30 Q -6 50 4 70 Q 10 85 0 100" stroke="#64748b" strokeWidth={1.5} fill="none" />
              <ellipse cx={0} cy={0} rx={24} ry={30} fill={b.color} />
              <ellipse cx={-8} cy={-10} rx={6} ry={9} fill="white" opacity={0.45} />
              <polygon points="-5,29 5,29 0,36" fill={b.color} />
            </g>
          )}
        </g>
      ))}

      {/* hills and grass */}
      <ellipse cx={250} cy={640} rx={420} ry={120} fill="#86efac" />
      <ellipse cx={980} cy={650} rx={460} ry={130} fill="#86efac" />
      <rect y={600} width={1200} height={100} fill="#4ade80" />

      {/* schoolhouse — tap the bell to ring it */}
      <g transform="translate(870 600)">
        <rect x={-170} y={-190} width={340} height={190} fill="#fecaca" stroke="#b91c1c" strokeWidth={3} />
        <polygon points="-195,-190 0,-290 195,-190" fill="#dc2626" />
        <rect x={-38} y={-300} width={76} height={48} fill="#fecaca" stroke="#b91c1c" strokeWidth={3} />
        <polygon points="-50,-300 0,-338 50,-300" fill="#dc2626" />
        <g className="pointer-events-auto cursor-pointer" onClick={() => play("bell", 900, 660)}>
          <g className={active.has("bell") ? "kid-ring" : undefined}>
            <path d="M -13 -262 Q -13 -290 0 -290 Q 13 -290 13 -262 Z" fill="#facc15" stroke="#a16207" strokeWidth={2} />
            <circle cx={0} cy={-259} r={3.5} fill="#a16207" />
          </g>
          {active.has("bell") && (
            <text x={48} y={-300} fontSize={18} fontWeight={900} fill="#a16207" stroke="white" strokeWidth={3} paintOrder="stroke">
              Ding! 🔔
            </text>
          )}
        </g>
        <rect x={-72} y={-178} width={144} height={30} rx={6} fill="#1e3a8a" />
        <text x={0} y={-157} fontSize={20} fontWeight={800} fill="white" textAnchor="middle" letterSpacing={4} fontFamily="'Trebuchet MS', sans-serif">
          SCHOOL
        </text>
        {[-140, -95, 55, 100].map((wx) => (
          <g key={wx}>
            <rect x={wx} y={-128} width={40} height={40} fill="#bae6fd" stroke="#1e3a8a" strokeWidth={3} />
            <line x1={wx + 20} y1={-128} x2={wx + 20} y2={-88} stroke="#1e3a8a" strokeWidth={2} />
            <line x1={wx} y1={-108} x2={wx + 40} y2={-108} stroke="#1e3a8a" strokeWidth={2} />
          </g>
        ))}
        <rect x={-30} y={-80} width={60} height={80} rx={6} fill="#92400e" />
        <circle cx={18} cy={-40} r={4} fill="#facc15" />
        <polygon points="-30,0 30,0 70,100 -70,100" fill="#fde68a" />
      </g>

      <Tree x={130} scale={0.9} />
      <Tree x={340} scale={1.1} />
      <Tree x={1150} scale={0.8} />

      {/* pencil and book lying on the grass */}
      <g transform="translate(450 668) rotate(-8)">
        <rect x={0} y={0} width={120} height={18} fill="#facc15" />
        <rect x={-14} y={0} width={14} height={18} fill="#f472b6" rx={3} />
        <polygon points="120,0 146,9 120,18" fill="#fcd34d" />
        <polygon points="138,6 146,9 138,12" fill="#1e293b" />
      </g>
      <g transform="translate(48 640)">
        <rect x={0} y={0} width={80} height={52} rx={4} fill="#3b82f6" />
        <rect x={6} y={6} width={68} height={40} rx={2} fill="#60a5fa" />
        <text x={40} y={33} fontSize={16} fontWeight={800} fill="white" textAnchor="middle">ABC</text>
      </g>

      {/* children — tap one to make them jump and say hi */}
      {KIDS.map((kid, i) => {
        const toy: Toy = `kid${i}`;
        return <Kid key={i} {...kid} jumping={active.has(toy)} onTap={() => play(toy, 1200, 440 + i * 110)} />;
      })}
    </svg>
  );
}
