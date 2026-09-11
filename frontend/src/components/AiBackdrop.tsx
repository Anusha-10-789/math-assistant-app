const STAR_PATH =
  "M0,-11 L3.1,-3.4 L11,-3.4 L4.5,1.3 L6.8,9 L0,4.4 L-6.8,9 L-4.5,1.3 L-11,-3.4 L-3.1,-3.4 Z";

type Shape =
  | { kind: "star"; x: number; y: number; scale: number; color: string; floatDur: number; floatDelay: number; twinkleDur: number; twinkleDelay: number }
  | { kind: "circle"; x: number; y: number; r: number; color: string; floatDur: number; floatDelay: number }
  | { kind: "symbol"; x: number; y: number; size: number; color: string; content: string; floatDur: number; floatDelay: number; wiggleDur: number; wiggleDelay: number };

const MATH_SYMBOLS = ["+", "5", "×", "3", "÷", "2", "="];
const SCIENCE_SYMBOLS = ["🌱", "🔬", "🐾", "💧", "🌍", "☀️", "🧪"];

function buildShapes(symbols: string[]): Shape[] {
  return [
    { kind: "star", x: 90, y: 100, scale: 1.6, color: "#f59e0b", floatDur: 5.5, floatDelay: 0, twinkleDur: 3, twinkleDelay: 0.2 },
    { kind: "circle", x: 210, y: 220, r: 10, color: "#34d399", floatDur: 6, floatDelay: 0.5 },
    { kind: "symbol", x: 300, y: 200, size: 34, color: "#60a5fa", content: symbols[0], floatDur: 5, floatDelay: 0.3, wiggleDur: 6.5, wiggleDelay: 0 },
    { kind: "circle", x: 380, y: 300, r: 14, color: "#fb7185", floatDur: 7, floatDelay: 1 },
    { kind: "symbol", x: 470, y: 220, size: 30, color: "#a78bfa", content: symbols[1], floatDur: 5.5, floatDelay: 0.8, wiggleDur: 7, wiggleDelay: 0.4 },
    { kind: "star", x: 560, y: 210, scale: 1.2, color: "#fb7185", floatDur: 6.5, floatDelay: 0.6, twinkleDur: 3.4, twinkleDelay: 0.5 },
    { kind: "symbol", x: 640, y: 260, size: 36, color: "#f59e0b", content: symbols[2], floatDur: 6, floatDelay: 0.2, wiggleDur: 6, wiggleDelay: 0.7 },
    { kind: "circle", x: 730, y: 210, r: 12, color: "#60a5fa", floatDur: 5, floatDelay: 0.9 },
    { kind: "star", x: 810, y: 320, scale: 1.8, color: "#34d399", floatDur: 6.8, floatDelay: 0.1, twinkleDur: 3.2, twinkleDelay: 0.9 },
    { kind: "symbol", x: 900, y: 200, size: 32, color: "#fb7185", content: symbols[3], floatDur: 5.2, floatDelay: 0.4, wiggleDur: 6.8, wiggleDelay: 0.2 },
    { kind: "circle", x: 950, y: 90, r: 9, color: "#a78bfa", floatDur: 6.2, floatDelay: 0.7 },
    { kind: "symbol", x: 140, y: 500, size: 34, color: "#34d399", content: symbols[4], floatDur: 6.4, floatDelay: 0.3, wiggleDur: 7.2, wiggleDelay: 0.6 },
    { kind: "star", x: 260, y: 600, scale: 1.3, color: "#60a5fa", floatDur: 5.8, floatDelay: 0.5, twinkleDur: 3.6, twinkleDelay: 0.3 },
    { kind: "circle", x: 420, y: 560, r: 11, color: "#f59e0b", floatDur: 6.6, floatDelay: 0.2 },
    { kind: "symbol", x: 540, y: 640, size: 30, color: "#a78bfa", content: symbols[5], floatDur: 5.4, floatDelay: 0.9, wiggleDur: 6.4, wiggleDelay: 0.5 },
    { kind: "star", x: 660, y: 560, scale: 1.5, color: "#f59e0b", floatDur: 6, floatDelay: 0.8, twinkleDur: 3.1, twinkleDelay: 0.1 },
    { kind: "circle", x: 780, y: 640, r: 13, color: "#fb7185", floatDur: 5.6, floatDelay: 0.4 },
    { kind: "symbol", x: 880, y: 570, size: 34, color: "#34d399", content: symbols[6], floatDur: 6.3, floatDelay: 0.6, wiggleDur: 7, wiggleDelay: 0.8 },
    { kind: "star", x: 480, y: 740, scale: 1.4, color: "#a78bfa", floatDur: 6.1, floatDelay: 0.7, twinkleDur: 3.3, twinkleDelay: 0.4 },
    { kind: "circle", x: 900, y: 740, r: 10, color: "#f59e0b", floatDur: 5.9, floatDelay: 0.1 },
  ];
}

const MATH_SHAPES = buildShapes(MATH_SYMBOLS);
const SCIENCE_SHAPES = buildShapes(SCIENCE_SYMBOLS);

interface AiBackdropProps {
  theme?: "math" | "science";
}

export default function AiBackdrop({ theme = "math" }: AiBackdropProps) {
  const shapes = theme === "science" ? SCIENCE_SHAPES : MATH_SHAPES;
  return (
    <svg
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-40"
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {shapes.map((shape, index) => {
        if (shape.kind === "circle") {
          return (
            <g key={index} transform={`translate(${shape.x} ${shape.y})`}>
              <g
                className="kid-float"
                style={{ animationDuration: `${shape.floatDur}s`, animationDelay: `${shape.floatDelay}s` }}
              >
                <circle r={shape.r} fill={shape.color} />
              </g>
            </g>
          );
        }

        if (shape.kind === "star") {
          return (
            <g key={index} transform={`translate(${shape.x} ${shape.y})`}>
              <g
                className="kid-float"
                style={{ animationDuration: `${shape.floatDur}s`, animationDelay: `${shape.floatDelay}s` }}
              >
                <g
                  className="kid-twinkle"
                  style={{ animationDuration: `${shape.twinkleDur}s`, animationDelay: `${shape.twinkleDelay}s` }}
                >
                  <path d={STAR_PATH} fill={shape.color} transform={`scale(${shape.scale})`} />
                </g>
              </g>
            </g>
          );
        }

        return (
          <g key={index} transform={`translate(${shape.x} ${shape.y})`}>
            <g
              className="kid-float"
              style={{ animationDuration: `${shape.floatDur}s`, animationDelay: `${shape.floatDelay}s` }}
            >
              <g
                className="kid-wiggle"
                style={{ animationDuration: `${shape.wiggleDur}s`, animationDelay: `${shape.wiggleDelay}s` }}
              >
                <text
                  fontSize={shape.size}
                  fill={shape.color}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {shape.content}
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
