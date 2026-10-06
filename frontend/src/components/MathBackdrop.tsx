// Background for the Maths pages: a chalkboard with a faint graph-paper grid,
// chalk sums that write themselves and fade, number balloons floating up, a
// ticking clock, an abacus with sliding beads, a fraction pizza, spinning
// shapes and a ruler. Animations live in index.css and stop for
// reduced-motion users.

const CHALK = ["#fde68a", "#a5f3fc", "#fbcfe8", "#bbf7d0", "#ddd6fe", "#fed7aa"];

// [text, left, top, size, colour index, delay seconds]
const SUMS: Array<[string, string, string, string, number, number]> = [
  ["2 + 3 = 5", "4%", "62%", "2.6rem", 0, 0],
  ["7 × 8 = 56", "34%", "34%", "2.4rem", 1, 2.5],
  ["½ + ½ = 1", "8%", "46%", "2.4rem", 2, 5],
  ["10 ÷ 2 = 5", "40%", "78%", "2.4rem", 3, 7.5],
  ["9 − 4 = 5", "60%", "40%", "2.2rem", 4, 10],
  ["3 × 4 = 12", "18%", "82%", "2.2rem", 5, 12.5],
  ["100 = 10 × 10", "54%", "88%", "2rem", 0, 15],
  ["25 + 25 = 50", "62%", "64%", "2rem", 3, 17.5],
];

// Balloons: [number, left, colour, seconds, delay]
const BALLOONS: Array<[number, string, string, number, number]> = [
  [1, "6%", "#f43f5e", 16, 0],
  [5, "22%", "#f59e0b", 19, 5],
  [3, "44%", "#22c55e", 17, 9],
  [8, "66%", "#3b82f6", 20, 2],
  [9, "86%", "#a855f7", 18, 12],
  [2, "33%", "#ec4899", 21, 14],
];

function Balloon({ n, color }: { n: number; color: string }) {
  return (
    <svg viewBox="0 0 60 110" className="h-[13vmin] w-[7vmin]">
      <path d="M30 70 q-4 10 2 20 q6 10 -2 20" stroke="#e2e8f0" strokeWidth="1.5" fill="none" />
      <ellipse cx="30" cy="34" rx="26" ry="32" fill={color} />
      <ellipse cx="21" cy="22" rx="6" ry="9" fill="#ffffff" opacity="0.35" />
      <path d="M26 65 L34 65 L30 72 Z" fill={color} />
      <text x="30" y="45" textAnchor="middle" fontSize="30" fontWeight="700" fontFamily="Fredoka, Nunito, sans-serif" fill="#ffffff">
        {n}
      </text>
    </svg>
  );
}

export default function MathBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      aria-hidden="true"
      style={{
        backgroundColor: "#0f3b3a",
        backgroundImage:
          "radial-gradient(ellipse at 75% 40%, rgba(45, 212, 191, 0.18), transparent 60%), " +
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), " +
          "linear-gradient(160deg, #134e4a 0%, #0f3b3a 50%, #0b2a2a 100%)",
        backgroundSize: "100% 100%, 40px 40px, 40px 40px, 100% 100%",
      }}
    >
      {/* Chalk sums that write themselves, then fade */}
      {SUMS.map(([text, left, top, size, color, delay]) => (
        <span
          key={text}
          className="math-chalk absolute whitespace-nowrap font-display font-semibold"
          style={{ left, top, fontSize: size, color: CHALK[color], animationDelay: `${delay}s`, textShadow: "0 0 10px rgba(255,255,255,0.15)" }}
        >
          {text}
        </span>
      ))}

      {/* Spinning chalk shapes */}
      <svg viewBox="0 0 100 100" className="math-spin absolute left-[2%] top-[66%] h-[9vmin] w-[9vmin]" style={{ animationDuration: "18s" }}>
        <polygon points="50,8 92,88 8,88" fill="none" stroke={CHALK[0]} strokeWidth="5" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 100 100" className="math-spin absolute left-[48%] top-[56%] h-[7vmin] w-[7vmin]" style={{ animationDuration: "22s", animationDirection: "reverse" }}>
        <rect x="14" y="14" width="72" height="72" rx="6" fill="none" stroke={CHALK[1]} strokeWidth="5" />
      </svg>
      <svg viewBox="0 0 100 100" className="math-spin absolute left-[28%] top-[52%] h-[8vmin] w-[8vmin]" style={{ animationDuration: "26s" }}>
        <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke={CHALK[4]} strokeWidth="5" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 100 100" className="math-spin absolute left-[58%] top-[4%] h-[7vmin] w-[7vmin]" style={{ animationDuration: "20s", animationDirection: "reverse" }}>
        <polygon points="50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38" fill="none" stroke={CHALK[2]} strokeWidth="5" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 100 100" className="absolute left-[16%] top-[4%] h-[6vmin] w-[6vmin]">
        <circle cx="50" cy="50" r="40" fill="none" stroke={CHALK[3]} strokeWidth="5" strokeDasharray="10 8" />
      </svg>

      {/* Number balloons floating up */}
      {BALLOONS.map(([n, left, color, seconds, delay]) => (
        <div key={`${n}-${left}`} className="math-rise absolute bottom-0" style={{ left, animationDuration: `${seconds}s`, animationDelay: `${delay}s` }}>
          <div className="math-sway">
            <Balloon n={n} color={color} />
          </div>
        </div>
      ))}

      {/* Clock with moving hands */}
      <svg viewBox="0 0 100 100" className="absolute right-[4vmin] top-[6vmin] h-[22vmin] w-[22vmin] drop-shadow-xl">
        <circle cx="50" cy="50" r="46" fill="#fff7ed" stroke="#f97316" strokeWidth="5" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              x1={50 + 38 * Math.sin(a)}
              y1={50 - 38 * Math.cos(a)}
              x2={50 + (i % 3 === 0 ? 32 : 35) * Math.sin(a)}
              y2={50 - (i % 3 === 0 ? 32 : 35) * Math.cos(a)}
              stroke="#7c2d12"
              strokeWidth={i % 3 === 0 ? 3 : 1.6}
              strokeLinecap="round"
            />
          );
        })}
        <g fontFamily="Fredoka, Nunito, sans-serif" fontWeight="600" fontSize="10" fill="#7c2d12" textAnchor="middle">
          <text x="50" y="25">12</text>
          <text x="77" y="54">3</text>
          <text x="50" y="82">6</text>
          <text x="23" y="54">9</text>
        </g>
        <line x1="50" y1="50" x2="50" y2="30" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" className="math-hand" style={{ animationDuration: "72s" }} />
        <line x1="50" y1="50" x2="50" y2="18" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" className="math-hand" style={{ animationDuration: "6s" }} />
        <circle cx="50" cy="50" r="3.5" fill="#1e293b" />
      </svg>

      {/* Fraction pizza: one slice of eight pops out */}
      <svg viewBox="0 0 120 120" className="absolute right-[6vmin] top-[42%] h-[20vmin] w-[20vmin] drop-shadow-xl">
        <circle cx="60" cy="60" r="50" fill="#f59e0b" />
        <circle cx="60" cy="60" r="44" fill="#fde68a" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1="60" y1="60" x2={60 + 50 * Math.cos(a)} y2={60 + 50 * Math.sin(a)} stroke="#b45309" strokeWidth="2" />;
        })}
        {[[45, 40], [75, 48], [52, 78], [80, 74], [36, 62]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#dc2626" />
        ))}
        <g className="math-slice">
          <path d={`M60 60 L110 60 A50 50 0 0 0 ${60 + 50 * Math.cos(-Math.PI / 4)} ${60 + 50 * Math.sin(-Math.PI / 4)} Z`} fill="#f59e0b" />
          <path d={`M60 60 L104 60 A44 44 0 0 0 ${60 + 44 * Math.cos(-Math.PI / 4)} ${60 + 44 * Math.sin(-Math.PI / 4)} Z`} fill="#fde68a" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="88" cy="50" r="4.5" fill="#dc2626" />
        </g>
        <text x="60" y="118" textAnchor="middle" fontFamily="Fredoka, Nunito, sans-serif" fontWeight="600" fontSize="13" fill="#fef3c7">
          ⅛ slice
        </text>
      </svg>

      {/* Abacus with sliding beads */}
      <svg viewBox="0 0 140 110" className="absolute bottom-[8vmin] right-[3vmin] h-[22vmin] w-[28vmin] drop-shadow-xl">
        <rect x="4" y="4" width="132" height="102" rx="8" fill="#92400e" />
        <rect x="12" y="12" width="116" height="86" rx="4" fill="#fef3c7" />
        {[0, 1, 2, 3].map((row) => {
          const y = 26 + row * 20;
          const colors = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7"];
          return (
            <g key={row}>
              <line x1="12" y1={y} x2="128" y2={y} stroke="#78350f" strokeWidth="2.5" />
              <g className="math-bead" style={{ animationDelay: `${row * 0.9}s`, animationDuration: `${4 + row}s` }}>
                {[0, 1, 2, 3, 4].map((b) => (
                  <ellipse key={b} cx={22 + b * 11} cy={y} rx="5.5" ry="7" fill={colors[row]} stroke="#00000033" strokeWidth="1" />
                ))}
              </g>
            </g>
          );
        })}
      </svg>

      {/* Ruler along the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-[4vmin] min-h-[18px] border-t-2 border-amber-600 bg-amber-300"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #92400e 0 2px, transparent 2px 50px), repeating-linear-gradient(90deg, #b45309 0 1px, transparent 1px 10px)",
          backgroundSize: "100% 60%, 100% 30%",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
