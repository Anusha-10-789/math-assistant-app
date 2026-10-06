interface ReadingKidProps {
  className?: string;
  kid?: "girl" | "boy";
}

const LOOKS = {
  girl: {
    label: "A girl reading a book",
    shirt: "#f472b6",
    collar: "#db2777",
    legs: "#7d58f6",
    legsDark: "#6a3aeb",
    shoes: "#f97316",
    cover: "#ef4444",
    skin: "#d39a6a",
    skinShade: "#c68a5e",
  },
  boy: {
    label: "A boy reading a book",
    shirt: "#10b981",
    collar: "#059669",
    legs: "#3b82f6",
    legsDark: "#2563eb",
    shoes: "#f59e0b",
    cover: "#2563eb",
    skin: "#c08457",
    skinShade: "#b0744a",
  },
};

// The app's mascots: a small girl or boy sitting cross-legged, reading an
// open book. The head nods gently, a page turns, and letters float up out of
// the book (animations in index.css; all of them stop for reduced-motion users).
export default function ReadingKid({ className = "", kid = "girl" }: ReadingKidProps) {
  const look = LOOKS[kid];
  return (
    <svg viewBox="0 0 220 220" className={className} role="img" aria-label={look.label}>
      {/* Floating letters rising from the book */}
      <g fontFamily="Fredoka, Nunito, sans-serif" fontWeight={600} textAnchor="middle">
        <text x="84" y="128" fontSize="18" fill="#7d58f6" className="kid-rise" style={{ animationDelay: "0s" }}>
          A
        </text>
        <text x="112" y="124" fontSize="16" fill="#f59e0b" className="kid-rise" style={{ animationDelay: "1.1s" }}>
          ★
        </text>
        <text x="138" y="128" fontSize="18" fill="#10b981" className="kid-rise" style={{ animationDelay: "2.2s" }}>
          B
        </text>
        <text x="98" y="126" fontSize="15" fill="#ec4899" className="kid-rise" style={{ animationDelay: "3.3s" }}>
          1
        </text>
        <text x="126" y="126" fontSize="15" fill="#0ea5e9" className="kid-rise" style={{ animationDelay: "4.4s" }}>
          +
        </text>
      </g>

      {/* Ground shadow */}
      <ellipse cx="110" cy="204" rx="74" ry="8" fill="#1e1450" opacity="0.08" />

      {/* Crossed legs and shoes */}
      <ellipse cx="110" cy="186" rx="58" ry="17" fill={look.legs} />
      <ellipse cx="84" cy="184" rx="22" ry="9" fill={look.legsDark} />
      <ellipse cx="136" cy="184" rx="22" ry="9" fill={look.legsDark} />
      <ellipse cx="56" cy="192" rx="12" ry="7" fill={look.shoes} />
      <ellipse cx="164" cy="192" rx="12" ry="7" fill={look.shoes} />

      {/* Body: T-shirt */}
      <path d="M78 128 Q110 112 142 128 L152 182 Q110 194 68 182 Z" fill={look.shirt} />
      <path d="M98 120 Q110 128 122 120" stroke={look.collar} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Arms reaching to the book */}
      <path d="M84 132 Q66 144 66 156" stroke={look.shirt} strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M136 132 Q154 144 154 156" stroke={look.shirt} strokeWidth="14" fill="none" strokeLinecap="round" />

      {/* Head (nods gently while reading) */}
      <g className="kid-nod">
        {kid === "girl" && (
          <>
            {/* Two pigtails with pink bows, behind the head */}
            <ellipse cx="72" cy="92" rx="11" ry="17" fill="#2d1b12" transform="rotate(18 72 92)" />
            <ellipse cx="148" cy="92" rx="11" ry="17" fill="#2d1b12" transform="rotate(-18 148 92)" />
            <path d="M70 68 l-12 -7 v14 Z M70 68 l12 -7 v14 Z" fill="#ec4899" />
            <circle cx="70" cy="68" r="3.5" fill="#be185d" />
            <path d="M150 68 l-12 -7 v14 Z M150 68 l12 -7 v14 Z" fill="#ec4899" />
            <circle cx="150" cy="68" r="3.5" fill="#be185d" />
          </>
        )}
        <rect x="103" y="104" width="14" height="14" rx="5" fill={look.skinShade} />
        <circle cx="80" cy="84" r="7" fill={look.skinShade} />
        <circle cx="140" cy="84" r="7" fill={look.skinShade} />
        <circle cx="110" cy="80" r="31" fill={look.skin} />
        {kid === "girl" ? (
          // Hair parted in the middle, with a side fringe
          <path d="M78 84 Q75 47 110 46 Q145 47 142 84 Q138 64 122 60 Q112 66 110 56 Q106 66 96 62 Q82 66 78 84 Z" fill="#2d1b12" />
        ) : (
          // Short, spiky hair
          <path
            d="M79 80 Q76 50 96 46 L100 38 L106 45 L113 36 L118 45 L126 40 L127 49 Q144 54 141 80 Q136 64 124 63 L119 57 L113 64 L106 57 L100 64 Q86 64 79 80 Z"
            fill="#1f140d"
          />
        )}
        {/* Eyes looking down at the page, rosy cheeks, smile */}
        <path d="M95 86 q5 4 10 0" stroke="#2d1b12" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M115 86 q5 4 10 0" stroke="#2d1b12" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="92" cy="96" r="5" fill="#fb7185" opacity="0.45" />
        <circle cx="128" cy="96" r="5" fill="#fb7185" opacity="0.45" />
        <path d="M103 99 q7 6 14 0" stroke="#2d1b12" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* The open book: cover, two pages with lines, and a page that turns */}
      <path d="M110 146 Q85 135 58 141 L58 175 Q85 169 110 180 Q135 169 162 175 L162 141 Q135 135 110 146 Z" fill={look.cover} />
      <path d="M110 143 Q87 133 63 138 L63 171 Q87 165 110 176 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <path d="M110 143 Q133 133 157 138 L157 171 Q133 165 110 176 Z" fill="#fffdf5" stroke="#e2e8f0" strokeWidth="1.5" />
      <path
        d="M110 143 Q133 133 157 138 L157 171 Q133 165 110 176 Z"
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        className="kid-page-turn"
      />
      <line x1="110" y1="143" x2="110" y2="176" stroke="#e2e8f0" strokeWidth="2" />
      <g stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M72 147 Q88 143 102 149" />
        <path d="M72 155 Q88 151 102 157" />
        <path d="M72 163 Q86 159 98 164" />
        <path d="M118 149 Q132 143 148 147" />
        <path d="M118 157 Q132 151 148 155" />
      </g>

      {/* Hands holding the book */}
      <circle cx="64" cy="158" r="8" fill={look.skin} />
      <circle cx="156" cy="158" r="8" fill={look.skin} />
    </svg>
  );
}
