import ReadingKid from "./ReadingKid";

// Letters, numbers and stars drifting around the poster: [text, left, top, size, colour, seconds].
const FLOATERS: Array<[string, string, string, string, string, number]> = [
  ["A", "6%", "14%", "3.2rem", "#7d58f6", 6],
  ["★", "22%", "8%", "2.2rem", "#f59e0b", 5],
  ["B", "40%", "18%", "2.6rem", "#10b981", 7],
  ["1", "12%", "48%", "2.8rem", "#ec4899", 6.5],
  ["+", "30%", "70%", "2.6rem", "#0ea5e9", 5.5],
  ["C", "56%", "8%", "2.4rem", "#f97316", 6.8],
  ["★", "48%", "56%", "1.8rem", "#a78bfa", 5.2],
  ["2", "70%", "12%", "2.6rem", "#14b8a6", 7.2],
  ["✏️", "4%", "80%", "2.2rem", "#000", 6.2],
  ["📖", "88%", "8%", "2.4rem", "#000", 6.6],
  ["★", "84%", "34%", "2rem", "#f472b6", 5.8],
];

interface ReadingPosterProps {
  // "app": a smaller child, so page content beside it doesn't hide the face.
  variant?: "login" | "app";
}

// The backdrop for every page: a poster of a child reading a book, sitting
// in a warm pool of light, with letters and numbers floating around.
export default function ReadingPoster({ variant = "login" }: ReadingPosterProps) {
  const kidSize =
    variant === "app"
      ? "sm:h-[52vh] sm:max-h-[560px] sm:w-[52vh] sm:max-w-[560px]"
      : "sm:h-[74vh] sm:max-h-[820px] sm:w-[74vh] sm:max-w-[820px]";
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-indigo-50 to-amber-100" />

      {/* Soft sunshine behind the child */}
      <div className="absolute bottom-[-30vh] left-1/2 h-[110vh] w-[110vh] -translate-x-1/2 rounded-full bg-amber-200/60 blur-3xl sm:left-auto sm:right-[-22vh] sm:translate-x-0" />
      <div className={`absolute bottom-[6vh] left-1/2 h-[44vh] w-[44vh] -translate-x-1/2 rounded-full bg-white/70 sm:left-auto sm:right-[6vh] sm:translate-x-0 ${variant === "app" ? "sm:h-[46vh] sm:w-[46vh]" : "sm:h-[66vh] sm:w-[66vh]"}`} />

      {FLOATERS.map(([text, left, top, size, color, seconds], index) => (
        <span
          key={index}
          className="kid-float absolute font-display font-semibold opacity-70"
          style={{ left, top, fontSize: size, color, animationDuration: `${seconds}s`, animationDelay: `${index * 0.4}s` }}
        >
          {text}
        </span>
      ))}

      {/* Floor and the reading child */}
      <div className="absolute inset-x-0 bottom-0 h-[9vh] bg-gradient-to-b from-amber-200/70 to-amber-300/80" />
      <ReadingKid className={`absolute bottom-[2vh] left-1/2 h-[46vh] w-[46vh] -translate-x-1/2 sm:left-auto sm:right-[2vh] sm:translate-x-0 ${kidSize}`} />
    </div>
  );
}
