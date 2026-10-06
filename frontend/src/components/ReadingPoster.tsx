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
  // "login": a boy and a girl reading on either side of the centred card.
  // "app": one smaller child on the right, so page content doesn't hide the face.
  variant?: "login" | "app";
}

// The backdrop for every page: a poster of a child reading a book, sitting
// in a warm pool of light, with letters and numbers floating around.
export default function ReadingPoster({ variant = "login" }: ReadingPosterProps) {
  const isLogin = variant === "login";
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-indigo-50 to-amber-100" />

      {/* Soft sunshine behind the children */}
      {isLogin && (
        <>
          <div className="absolute bottom-[-30vh] left-[-22vh] h-[90vh] w-[90vh] rounded-full bg-sky-200/60 blur-3xl" />
          <div className="absolute bottom-[4vh] left-[-6vh] h-[30vh] w-[30vh] rounded-full bg-white/70 sm:left-[2vh] sm:h-[56vh] sm:w-[56vh]" />
        </>
      )}
      <div className="absolute bottom-[-30vh] right-[-22vh] h-[90vh] w-[90vh] rounded-full bg-amber-200/60 blur-3xl" />
      <div
        className={`absolute rounded-full bg-white/70 ${
          isLogin
            ? "bottom-[4vh] right-[-6vh] h-[30vh] w-[30vh] sm:right-[2vh] sm:h-[56vh] sm:w-[56vh]"
            : "bottom-[6vh] left-1/2 h-[44vh] w-[44vh] -translate-x-1/2 sm:left-auto sm:right-[6vh] sm:h-[46vh] sm:w-[46vh] sm:translate-x-0"
        }`}
      />

      {FLOATERS.map(([text, left, top, size, color, seconds], index) => (
        <span
          key={index}
          className={`kid-float absolute font-display font-semibold ${isLogin ? "opacity-70" : "opacity-25"}`}
          style={{ left, top, fontSize: size, color, animationDuration: `${seconds}s`, animationDelay: `${index * 0.4}s` }}
        >
          {text}
        </span>
      ))}

      {/* Floor and the reading children */}
      <div className="absolute inset-x-0 bottom-0 h-[9vh] bg-gradient-to-b from-amber-200/70 to-amber-300/80" />
      {isLogin ? (
        <>
          {/* Login: a boy reading on the left, a girl reading on the right, the card between them */}
          <ReadingKid
            kid="boy"
            className="absolute bottom-[1vh] left-[-4vh] h-[30vh] w-[30vh] sm:left-[1vh] sm:h-[min(62vh,calc(50vw_-_13rem),700px)] sm:w-[min(62vh,calc(50vw_-_13rem),700px)]"
          />
          <ReadingKid
            kid="girl"
            className="absolute bottom-[1vh] right-[-4vh] h-[30vh] w-[30vh] sm:right-[1vh] sm:h-[min(62vh,calc(50vw_-_13rem),700px)] sm:w-[min(62vh,calc(50vw_-_13rem),700px)]"
          />
        </>
      ) : (
        <ReadingKid
          kid="girl"
          className="absolute bottom-[2vh] left-1/2 h-[46vh] w-[46vh] -translate-x-1/2 sm:left-auto sm:right-[2vh] sm:h-[52vh] sm:max-h-[560px] sm:w-[52vh] sm:max-w-[560px] sm:translate-x-0"
        />
      )}
    </div>
  );
}
