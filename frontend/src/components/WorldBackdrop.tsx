// Background for the Social Studies pages: a journey round the world — a
// spinning globe, India's flag with its turning chakra, a plane on a dotted
// route, a train and a boat, a compass, map pins and famous landmarks.
// Animations live in index.css and stop for reduced-motion users.

// [emoji, left, top, size, seconds]
const LANDMARKS: Array<[string, string, string, string, number]> = [
  ["🕌", "5%", "38%", "3rem", 7],
  ["🛕", "30%", "60%", "3rem", 8],
  ["🏰", "50%", "30%", "2.6rem", 6.5],
  ["🗼", "62%", "64%", "2.6rem", 7.5],
  ["🗽", "18%", "20%", "2.6rem", 8.5],
  ["🏯", "44%", "8%", "2.4rem", 7],
  ["🏛️", "70%", "36%", "2.6rem", 6],
];

// [left, top, delay]
const PINS: Array<[string, string, number]> = [
  ["14%", "50%", 0],
  ["38%", "40%", 0.8],
  ["58%", "52%", 1.6],
  ["26%", "74%", 2.4],
];

// Rough continents on a 200×100 map strip; the strip slides behind a round
// window, so the globe looks like it is turning.
function Continents({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`} fill="#4ade80" stroke="#15803d" strokeWidth="1">
      <path d="M18 18 Q30 10 42 16 Q48 26 40 36 Q34 44 36 52 Q30 50 26 42 Q16 36 18 18 Z" />
      <path d="M36 56 Q44 54 46 64 Q44 78 38 88 Q34 80 34 70 Q32 62 36 56 Z" />
      <path d="M82 16 Q94 12 100 20 Q96 28 88 28 Q82 24 82 16 Z" />
      <path d="M84 32 Q98 30 104 42 Q102 58 94 70 Q88 64 86 54 Q80 44 84 32 Z" />
      <path d="M104 14 Q130 8 156 16 Q164 26 150 34 Q140 46 128 40 Q120 46 114 36 Q104 30 104 14 Z" />
      <path d="M120 38 Q126 42 124 52 Q120 50 118 44 Z" />
      <path d="M150 64 Q164 60 170 68 Q166 78 154 76 Q148 72 150 64 Z" />
    </g>
  );
}

export default function WorldBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      aria-hidden="true"
      style={{
        backgroundColor: "#0b3a5c",
        backgroundImage:
          "radial-gradient(ellipse at 78% 30%, rgba(56, 189, 248, 0.25), transparent 55%), " +
          "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1.5px), " +
          "linear-gradient(170deg, #0e4a70 0%, #0b3a5c 55%, #082c47 100%)",
        backgroundSize: "100% 100%, 28px 28px, 100% 100%",
      }}
    >
      {/* Dotted flight route and the plane flying along it */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M-5 85 Q 40 10 105 30" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.25" strokeDasharray="1 1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="world-plane absolute left-0 top-0 text-[2.6rem] drop-shadow-lg">✈️</span>

      {/* Landmarks and map pins */}
      {LANDMARKS.map(([emoji, left, top, size, seconds]) => (
        <span key={emoji} className="world-bob absolute opacity-60" style={{ left, top, fontSize: size, animationDuration: `${seconds}s` }}>
          {emoji}
        </span>
      ))}
      {PINS.map(([left, top, delay]) => (
        <span key={`${left}${top}`} className="world-pin absolute text-[2rem]" style={{ left, top, animationDelay: `${delay}s` }}>
          📍
        </span>
      ))}

      {/* India's flag with the Ashoka Chakra turning */}
      <svg viewBox="0 0 120 90" className="absolute bottom-[14vmin] right-[5vmin] h-[13vmin] w-[17vmin] drop-shadow-lg">
        <rect x="6" y="4" width="3" height="84" rx="1.5" fill="#cbd5e1" />
        <g className="world-flag">
          <rect x="9" y="6" width="100" height="22" fill="#ff9933" />
          <rect x="9" y="28" width="100" height="22" fill="#ffffff" />
          <rect x="9" y="50" width="100" height="22" fill="#138808" />
          <g className="world-chakra">
            <circle cx="59" cy="39" r="9" fill="none" stroke="#000080" strokeWidth="1.6" />
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * Math.PI) / 12;
              return <line key={i} x1="59" y1="39" x2={59 + 9 * Math.cos(a)} y2={39 + 9 * Math.sin(a)} stroke="#000080" strokeWidth="0.6" />;
            })}
          </g>
        </g>
      </svg>

      {/* The spinning globe */}
      <svg viewBox="0 0 100 100" className="absolute right-[5vmin] top-[6vmin] h-[30vmin] w-[30vmin] drop-shadow-[0_0_30px_rgba(56,189,248,0.45)]">
        <defs>
          <clipPath id="world-globe">
            <circle cx="50" cy="50" r="44" />
          </clipPath>
          <radialGradient id="world-shade" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="44" fill="#38bdf8" />
        <g clipPath="url(#world-globe)">
          <g className="world-spin">
            <Continents x={0} />
            <Continents x={200} />
          </g>
          <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6">
            <ellipse cx="50" cy="50" rx="44" ry="14" />
            <line x1="6" y1="50" x2="94" y2="50" />
            <ellipse cx="50" cy="50" rx="16" ry="44" />
            <line x1="50" y1="6" x2="50" y2="94" />
          </g>
        </g>
        <circle cx="50" cy="50" r="44" fill="url(#world-shade)" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#e0f2fe" strokeWidth="1.5" />
      </svg>

      {/* Compass */}
      <svg viewBox="0 0 100 100" className="absolute right-[6vmin] top-[44%] h-[18vmin] w-[18vmin] drop-shadow-xl">
        <circle cx="50" cy="50" r="46" fill="#fef3c7" stroke="#b45309" strokeWidth="4" />
        <g fontFamily="Fredoka, Nunito, sans-serif" fontWeight="700" fontSize="13" textAnchor="middle" fill="#7c2d12">
          <text x="50" y="20">N</text>
          <text x="84" y="55">E</text>
          <text x="50" y="91">S</text>
          <text x="16" y="55">W</text>
        </g>
        <g className="world-needle">
          <polygon points="50,22 57,50 50,50" fill="#ef4444" />
          <polygon points="50,22 43,50 50,50" fill="#dc2626" />
          <polygon points="50,78 57,50 50,50" fill="#64748b" />
          <polygon points="50,78 43,50 50,50" fill="#475569" />
        </g>
        <circle cx="50" cy="50" r="4" fill="#1e293b" />
      </svg>

      {/* Waves with a sailing boat, and a train on its track */}
      <div className="absolute inset-x-0 bottom-[7vmin] h-[5vmin] opacity-80" style={{ backgroundImage: "radial-gradient(circle at 50% 0, transparent 60%, rgba(125, 211, 252, 0.5) 62%)", backgroundSize: "40px 20px" }} />
      <span className="world-boat absolute bottom-[9vmin] text-[2.6rem]">⛵</span>
      <div
        className="absolute inset-x-0 bottom-0 h-[5vmin] min-h-[22px] bg-amber-800"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, #451a03 0 6px, transparent 6px 26px), linear-gradient(#94a3b8 0 3px, transparent 3px)", backgroundSize: "100% 100%, 100% 100%" }}
      />
      <span className="world-train absolute bottom-[2.5vmin] whitespace-nowrap text-[2.6rem] leading-none">🚂🚃🚃🚃</span>
    </div>
  );
}
