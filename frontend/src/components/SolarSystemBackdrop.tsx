import type { CSSProperties } from "react";

// Background for the Science pages: a smiling Sun with the eight planets
// orbiting it (each labelled, so the backdrop teaches too), twinkling stars,
// shooting stars, a rocket, a floating astronaut and a drifting UFO.
// Animations live in index.css and stop for reduced-motion users.

interface Planet {
  name: string;
  size: number; // vmin
  orbit: number; // radius in vmin
  seconds: number; // one trip round the Sun
  start: number; // 0-1 of the way round at load
  style: CSSProperties;
  ring?: boolean;
  moon?: boolean;
}

const PLANETS: Planet[] = [
  { name: "Mercury", size: 2.2, orbit: 21, seconds: 30, start: 0.15, style: { background: "radial-gradient(circle at 35% 35%, #e7e5e4, #a8a29e 60%, #78716c)" } },
  { name: "Venus", size: 3, orbit: 29, seconds: 44, start: 0.55, style: { background: "radial-gradient(circle at 35% 35%, #fef3c7, #fbbf24 55%, #d97706)" } },
  {
    name: "Earth",
    size: 3.6,
    orbit: 38,
    seconds: 60,
    start: 0.3,
    moon: true,
    style: { background: "radial-gradient(circle at 30% 30%, #86efac 0 18%, transparent 19%), radial-gradient(circle at 65% 62%, #4ade80 0 16%, transparent 17%), radial-gradient(circle at 35% 35%, #7dd3fc, #2563eb 70%)" },
  },
  { name: "Mars", size: 2.8, orbit: 47, seconds: 80, start: 0.75, style: { background: "radial-gradient(circle at 35% 35%, #fca5a5, #ef4444 55%, #991b1b)" } },
  {
    name: "Jupiter",
    size: 7.5,
    orbit: 61,
    seconds: 120,
    start: 0.45,
    style: {
      background:
        "radial-gradient(ellipse at 62% 62%, #c2410c 0 8%, transparent 9%), repeating-linear-gradient(180deg, #fde68a 0 12%, #f59e0b 12% 22%, #fef3c7 22% 32%, #d97706 32% 40%)",
    },
  },
  { name: "Saturn", size: 6, orbit: 76, seconds: 160, start: 0.05, ring: true, style: { background: "repeating-linear-gradient(180deg, #fef08a 0 18%, #facc15 18% 34%, #fde68a 34% 50%)" } },
  { name: "Uranus", size: 4.4, orbit: 89, seconds: 200, start: 0.62, style: { background: "radial-gradient(circle at 35% 35%, #cffafe, #67e8f9 55%, #0891b2)" } },
  { name: "Neptune", size: 4.2, orbit: 101, seconds: 240, start: 0.88, style: { background: "radial-gradient(circle at 35% 35%, #bfdbfe, #3b82f6 55%, #1e3a8a)" } },
];

// Stars at fixed pseudo-random spots, so they don't jump between renders.
const STARS = Array.from({ length: 80 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { left: r(1) * 100, top: r(2) * 100, size: 1 + r(3) * 2.5, seconds: 2 + r(4) * 4, delay: r(5) * 4 };
});

// Where the Sun sits: near the right edge, so the planets sweep across the screen.
const SUN_X = "calc(100% - 15vmin)";
const SUN_Y = "58%";

export default function SolarSystemBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      aria-hidden="true"
      style={{ background: "radial-gradient(ellipse at 80% 60%, #3b2a7a 0%, #1e1b4b 40%, #0b1030 75%, #050816 100%)" }}
    >
      {/* Stars */}
      {STARS.map((star, i) => (
        <span
          key={i}
          className="space-twinkle absolute rounded-full bg-white"
          style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, animationDuration: `${star.seconds}s`, animationDelay: `${star.delay}s` }}
        />
      ))}

      {/* Shooting stars */}
      <span className="space-shooting absolute left-[10%] top-[8%] h-[2px] w-40 rounded-full bg-gradient-to-r from-transparent via-white to-white" />
      <span className="space-shooting absolute left-[45%] top-[22%] h-[2px] w-32 rounded-full bg-gradient-to-r from-transparent via-sky-200 to-white" style={{ animationDelay: "5.5s" }} />

      {/* Orbit paths */}
      {PLANETS.map((planet) => (
        <span
          key={`orbit-${planet.name}`}
          className="absolute rounded-full border border-dashed border-white/15"
          style={{ left: SUN_X, top: SUN_Y, width: `${planet.orbit * 2}vmin`, height: `${planet.orbit * 2}vmin`, transform: "translate(-50%, -50%)" }}
        />
      ))}

      {/* Planets: each wrapper turns round the Sun; the planet turns back so it (and its name) stays upright */}
      {PLANETS.map((planet) => {
        const timing: CSSProperties = { animationDuration: `${planet.seconds}s`, animationDelay: `-${planet.start * planet.seconds}s` };
        return (
          <div key={planet.name} className="space-orbit absolute h-0 w-0" style={{ left: SUN_X, top: SUN_Y, ...timing }}>
            <div className="absolute" style={{ left: `-${planet.orbit}vmin`, top: 0 }}>
              <div className="space-counter flex flex-col items-center" style={{ ...timing, transform: "translate(-50%, -50%)" }}>
                <div className="relative" style={{ width: `${planet.size}vmin`, height: `${planet.size}vmin` }}>
                  {planet.ring && (
                    <span
                      className="absolute left-1/2 top-1/2 rounded-[50%] border-[0.6vmin] border-amber-200/80"
                      style={{ width: `${planet.size * 2}vmin`, height: `${planet.size * 0.7}vmin`, transform: "translate(-50%, -50%) rotate(-18deg)" }}
                    />
                  )}
                  <span className="absolute inset-0 rounded-full shadow-[inset_-0.6vmin_-0.6vmin_1vmin_rgba(0,0,0,0.35)]" style={planet.style} />
                  {planet.moon && (
                    <span className="space-moon absolute left-1/2 top-1/2 h-0 w-0">
                      <span className="absolute h-[1.1vmin] w-[1.1vmin] rounded-full bg-slate-200" style={{ left: `${planet.size * 0.8}vmin`, top: "-0.55vmin" }} />
                    </span>
                  )}
                </div>
                <span className="mt-1 whitespace-nowrap rounded-full bg-white/10 px-2 font-display text-[max(10px,1.4vmin)] font-semibold tracking-wide text-white/80">
                  {planet.name}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* The smiling Sun */}
      <div
        className="space-sun-glow absolute rounded-full"
        style={{
          left: SUN_X,
          top: SUN_Y,
          width: "26vmin",
          height: "26vmin",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle at 40% 38%, #fff7cc 0%, #fde047 35%, #f59e0b 75%, #ea580c 100%)",
          boxShadow: "0 0 6vmin 2vmin rgba(251, 191, 36, 0.55), 0 0 18vmin 6vmin rgba(249, 115, 22, 0.25)",
        }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <path d="M30 42 q6 -7 12 0" stroke="#7c2d12" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M56 42 q6 -7 12 0" stroke="#7c2d12" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="28" cy="56" r="6" fill="#fb7185" opacity="0.5" />
          <circle cx="72" cy="56" r="6" fill="#fb7185" opacity="0.5" />
          <path d="M36 60 q14 14 28 0" stroke="#7c2d12" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Visitors from space */}
      <span className="space-rocket absolute bottom-0 left-0 text-[4rem] drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]">🚀</span>
      <span className="space-astronaut absolute left-[6%] top-[14%] text-[3.5rem]">🧑‍🚀</span>
      <span className="space-ufo absolute top-[6%] text-[2.6rem]">🛸</span>
    </div>
  );
}
