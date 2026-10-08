// Background for the General Knowledge pages: a quiz-show stage — sweeping
// spotlights, a glowing trophy, question marks and light bulbs floating up,
// a buzzer, medals, "Did you know?" cards and twinkling stage lights.
// Reuses the animations in index.css; all stop for reduced-motion users.

// Rising question marks and bulbs: [text, left, size, seconds, delay]
const FLOATERS: Array<[string, string, string, number, number]> = [
  ["❓", "6%", "2.6rem", 15, 0],
  ["💡", "20%", "2.4rem", 18, 4],
  ["❔", "36%", "2.4rem", 16, 8],
  ["⭐", "50%", "2rem", 19, 2],
  ["❓", "62%", "2.8rem", 17, 11],
  ["💡", "44%", "2.2rem", 20, 14],
];

// "Did you know?" cards that pop up and fade: [text, left, top, delay]
const FACTS: Array<[string, string, string, number]> = [
  ["🐅 India's national animal is the tiger", "22%", "70%", 0],
  ["🌏 There are 7 continents", "30%", "34%", 5],
  ["🦚 The peacock is our national bird", "40%", "84%", 10],
  ["🪐 Jupiter is the biggest planet", "24%", "50%", 15],
];

export default function QuizShowBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      aria-hidden="true"
      style={{
        backgroundColor: "#0f1d4a",
        backgroundImage:
          "radial-gradient(ellipse at 50% 110%, rgba(250, 204, 21, 0.25), transparent 50%), " +
          "radial-gradient(ellipse at 80% 30%, rgba(56, 189, 248, 0.22), transparent 55%), " +
          "linear-gradient(180deg, #1e2a6b 0%, #0f1d4a 60%, #0a1433 100%)",
      }}
    >
      {/* Two spotlights sweeping across the stage */}
      <div className="absolute -top-[10vh] left-[15%] h-[130vh] w-[30vmin] origin-top">
        <div className="math-sway h-full w-full origin-top bg-gradient-to-b from-yellow-200/30 via-yellow-100/10 to-transparent" style={{ clipPath: "polygon(45% 0, 55% 0, 100% 100%, 0 100%)", animationDuration: "7s" }} />
      </div>
      <div className="absolute -top-[10vh] right-[18%] h-[130vh] w-[30vmin] origin-top">
        <div className="math-sway h-full w-full origin-top bg-gradient-to-b from-sky-200/30 via-sky-100/10 to-transparent" style={{ clipPath: "polygon(45% 0, 55% 0, 100% 100%, 0 100%)", animationDuration: "9s", animationDelay: "-3s" }} />
      </div>

      {/* Stage lights along the top */}
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="space-twinkle absolute top-[1.5vh] h-3 w-3 rounded-full"
          style={{
            left: `${2 + i * 5.6}%`,
            backgroundColor: ["#facc15", "#f472b6", "#38bdf8", "#4ade80"][i % 4],
            boxShadow: "0 0 12px 2px currentColor",
            color: ["#facc15", "#f472b6", "#38bdf8", "#4ade80"][i % 4],
            animationDuration: `${1.6 + (i % 3) * 0.5}s`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}

      {/* Rising question marks, bulbs and stars */}
      {FLOATERS.map(([text, left, size, seconds, delay]) => (
        <span key={`${text}${left}`} className="math-rise absolute bottom-0" style={{ left, fontSize: size, animationDuration: `${seconds}s`, animationDelay: `${delay}s` }}>
          {text}
        </span>
      ))}

      {/* Did-you-know cards */}
      {FACTS.map(([text, left, top, delay]) => (
        <span
          key={text}
          className="math-chalk absolute whitespace-nowrap rounded-2xl border-2 border-yellow-300/70 bg-indigo-950/80 px-4 py-2 text-sm font-bold text-yellow-100 shadow-lg"
          style={{ left, top, animationDelay: `${delay}s` }}
        >
          <span className="mr-1 text-yellow-300">Did you know?</span> {text}
        </span>
      ))}

      {/* Glowing trophy on its podium */}
      <div className="absolute right-[5vmin] top-[8vmin] flex flex-col items-center">
        <span className="world-bob text-[16vmin] leading-none drop-shadow-[0_0_30px_rgba(250,204,21,0.7)]" style={{ animationDuration: "5s" }}>
          🏆
        </span>
        <div className="mt-1 h-[3vmin] w-[20vmin] rounded-t-lg bg-gradient-to-b from-indigo-300 to-indigo-500 shadow-lg" />
        <div className="h-[4vmin] w-[26vmin] rounded-t-lg bg-gradient-to-b from-indigo-400 to-indigo-700" />
      </div>

      {/* Medals and the buzzer */}
      <span className="kid-float absolute right-[30vmin] top-[44%] text-[6vmin]" style={{ animationDuration: "4s" }}>
        🥇
      </span>
      <span className="kid-float absolute right-[22vmin] top-[52%] text-[5vmin]" style={{ animationDuration: "5s", animationDelay: "1s" }}>
        🥈
      </span>
      <span className="kid-float absolute right-[14vmin] top-[46%] text-[5vmin]" style={{ animationDuration: "4.5s", animationDelay: "0.5s" }}>
        🥉
      </span>
      <svg viewBox="0 0 100 80" className="absolute bottom-[12vmin] right-[6vmin] h-[13vmin] w-[16vmin] drop-shadow-xl">
        <ellipse cx="50" cy="66" rx="44" ry="10" fill="#1e293b" />
        <rect x="10" y="44" width="80" height="22" rx="6" fill="#334155" />
        <ellipse cx="50" cy="44" rx="40" ry="9" fill="#475569" />
        <g className="world-pin" style={{ animationDuration: "2.4s" }}>
          <ellipse cx="50" cy="38" rx="28" ry="8" fill="#b91c1c" />
          <path d="M22 38 Q22 14 50 14 Q78 14 78 38 Z" fill="#ef4444" />
          <ellipse cx="42" cy="24" rx="8" ry="4" fill="#fecaca" opacity="0.7" />
        </g>
      </svg>

      {/* The stage floor */}
      <div className="absolute inset-x-0 bottom-0 h-[8vmin] min-h-[36px] border-t-4 border-yellow-400/80 bg-gradient-to-b from-indigo-700 to-indigo-950" />
    </div>
  );
}
