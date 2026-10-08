// Background for the English pages: a cosy storybook library — a big open
// book with letters floating up out of it, ABC blocks, speech bubbles that
// pop up with everyday English, a pencil, twinkling lights and a bookshelf.
// Reuses the animations in index.css; all stop for reduced-motion users.

// Speech bubbles: [text, left, top, colour, delay seconds]
const BUBBLES: Array<[string, string, string, string, number]> = [
  ["Hello!", "6%", "62%", "#fde68a", 0],
  ["Thank you", "34%", "30%", "#bbf7d0", 4],
  ["Once upon a time…", "50%", "70%", "#fbcfe8", 8],
  ["How are you?", "20%", "84%", "#bae6fd", 12],
  ["Good morning!", "58%", "12%", "#ddd6fe", 16],
];

// Floating letters: [letter, left, size, colour, seconds, delay]
const LETTERS: Array<[string, string, string, string, number, number]> = [
  ["A", "8%", "3rem", "#fde047", 16, 0],
  ["b", "24%", "2.6rem", "#f9a8d4", 19, 4],
  ["C", "40%", "3rem", "#86efac", 17, 8],
  ["d", "60%", "2.6rem", "#7dd3fc", 20, 2],
  ["E", "72%", "3rem", "#fdba74", 18, 11],
  ["?", "48%", "2.4rem", "#c4b5fd", 21, 14],
];

// Book spines on the shelf: [colour, height %]
const SPINES: Array<[string, number]> = [
  ["#ef4444", 86], ["#f59e0b", 72], ["#22c55e", 92], ["#3b82f6", 78], ["#a855f7", 88], ["#ec4899", 70],
  ["#14b8a6", 94], ["#f97316", 80], ["#6366f1", 74], ["#84cc16", 90], ["#e11d48", 82], ["#0ea5e9", 76],
];

function Block({ letter, color, className = "" }: { letter: string; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className}>
      <rect x="3" y="3" width="54" height="54" rx="8" fill={color} stroke="#00000033" strokeWidth="2" />
      <rect x="9" y="9" width="42" height="42" rx="5" fill="#ffffff" opacity="0.25" />
      <text x="30" y="43" textAnchor="middle" fontFamily="Fredoka, Nunito, sans-serif" fontWeight="700" fontSize="34" fill="#ffffff">
        {letter}
      </text>
    </svg>
  );
}

export default function StorybookBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      aria-hidden="true"
      style={{
        backgroundColor: "#3b1d4e",
        backgroundImage:
          "radial-gradient(ellipse at 78% 35%, rgba(251, 191, 36, 0.22), transparent 55%), " +
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 34px), " +
          "linear-gradient(170deg, #4c1d63 0%, #3b1d4e 55%, #2a1238 100%)",
      }}
    >
      {/* Twinkling fairy lights along the top */}
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="space-twinkle absolute h-2.5 w-2.5 rounded-full"
          style={{
            left: `${3 + i * 6.2}%`,
            top: `${2 + Math.abs(Math.sin(i * 0.8)) * 4}%`,
            backgroundColor: ["#fde047", "#f9a8d4", "#86efac", "#7dd3fc"][i % 4],
            boxShadow: "0 0 10px currentColor",
            animationDuration: `${2 + (i % 4) * 0.6}s`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Letters drifting up */}
      {LETTERS.map(([letter, left, size, color, seconds, delay]) => (
        <span
          key={`${letter}${left}`}
          className="math-rise absolute bottom-0 font-display font-semibold"
          style={{ left, fontSize: size, color, animationDuration: `${seconds}s`, animationDelay: `${delay}s`, textShadow: "0 0 12px rgba(255,255,255,0.25)" }}
        >
          {letter}
        </span>
      ))}

      {/* Speech bubbles that pop up and fade */}
      {BUBBLES.map(([text, left, top, color, delay]) => (
        <span
          key={text}
          className="math-chalk absolute whitespace-nowrap rounded-2xl px-4 py-2 font-display text-lg font-semibold text-slate-800 shadow-lg"
          style={{ left, top, backgroundColor: color, animationDelay: `${delay}s` }}
        >
          {text}
        </span>
      ))}

      {/* The big open storybook */}
      <svg viewBox="0 0 220 150" className="world-bob absolute right-[3vmin] top-[8vmin] h-[24vmin] w-[35vmin] drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]" style={{ animationDuration: "6s" }}>
        <path d="M110 30 Q70 12 14 22 L14 132 Q70 122 110 142 Q150 122 206 132 L206 22 Q150 12 110 30 Z" fill="#b91c1c" />
        <path d="M110 30 Q72 16 22 26 L22 124 Q72 116 110 134 Z" fill="#fffbeb" />
        <path d="M110 30 Q148 16 198 26 L198 124 Q148 116 110 134 Z" fill="#fef3c7" />
        <line x1="110" y1="30" x2="110" y2="134" stroke="#d6d3d1" strokeWidth="2" />
        <g stroke="#a8a29e" strokeWidth="3" strokeLinecap="round">
          <path d="M36 48 Q66 42 96 50" />
          <path d="M36 64 Q66 58 96 66" />
          <path d="M36 80 Q60 75 84 82" />
          <path d="M124 50 Q154 42 184 48" />
          <path d="M124 66 Q154 58 184 64" />
          <path d="M124 82 Q148 76 172 80" />
        </g>
        <text x="58" y="112" textAnchor="middle" fontSize="20">🐰</text>
        <text x="156" y="112" textAnchor="middle" fontSize="20">🐢</text>
      </svg>

      {/* ABC blocks */}
      <Block letter="A" color="#ef4444" className="world-bob absolute right-[22vmin] top-[42%] h-[10vmin] w-[10vmin]" />
      <Block letter="B" color="#3b82f6" className="world-bob absolute right-[11vmin] top-[44%] h-[10vmin] w-[10vmin]" />
      <Block letter="C" color="#22c55e" className="world-bob absolute right-[16vmin] top-[calc(44%-10vmin)] h-[10vmin] w-[10vmin]" />

      {/* A pencil writing, with its scribble appearing */}
      <svg viewBox="0 0 160 60" className="absolute right-[4vmin] top-[64%] h-[9vmin] w-[24vmin]">
        <path d="M6 44 C20 20 34 52 48 30 S76 46 90 26 S118 44 132 30" fill="none" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" className="math-chalk" style={{ animationDuration: "6s" }} />
      </svg>
      <span className="kid-float absolute right-[3vmin] top-[60%] text-[3.2rem]" style={{ animationDuration: "3s" }}>
        ✏️
      </span>

      {/* Bookshelf along the bottom */}
      <div className="absolute inset-x-0 bottom-0 flex h-[10vmin] min-h-[44px] items-end gap-[3px] border-t-[6px] border-amber-900 bg-amber-950/80 px-2">
        {Array.from({ length: 8 }, (_, group) =>
          SPINES.map(([color, height], i) => (
            <span key={`${group}-${i}`} className="w-[1.6vmin] min-w-[9px] rounded-t-sm" style={{ height: `${height}%`, backgroundColor: color, opacity: 0.85 }} />
          )),
        )}
      </div>
    </div>
  );
}
