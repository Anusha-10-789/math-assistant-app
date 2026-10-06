import ReadingKid from "./ReadingKid";

export type Subject = "Mathematics" | "Science";

interface SubjectSelectProps {
  onSelectSubject: (subject: Subject) => void;
  name: string;
  testsTaken: number;
  averagePercent: number | null;
  videosWatched: number;
}

const SUBJECTS: Array<{ subject: Subject; icon: string; tagline: string; art: string[]; className: string }> = [
  {
    subject: "Mathematics",
    icon: "🧮",
    tagline: "Numbers, shapes, money, time and more",
    art: ["➕", "✖️", "📐"],
    className: "from-orange-400 via-pink-500 to-rose-500 shadow-pink-300/60",
  },
  {
    subject: "Science",
    icon: "🔬",
    tagline: "Plants, animals, our body and the world",
    art: ["🌱", "🪐", "💧"],
    className: "from-emerald-400 via-teal-500 to-sky-500 shadow-teal-300/60",
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-white sm:flex-row sm:items-center sm:gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg sm:h-10 sm:w-10 sm:text-xl" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-xl font-semibold leading-none text-slate-900">{value}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">{label}</span>
      </span>
    </div>
  );
}

export default function SubjectSelect({ onSelectSubject, name, testsTaken, averagePercent, videosWatched }: SubjectSelectProps) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100 via-white to-sky-100 p-5 shadow-lg ring-1 ring-white sm:p-7">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-indigo-600">{greeting()} 👋</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Hi {name}!</h1>
            <p className="mt-1 text-base text-slate-600">What would you like to learn today?</p>
          </div>
          <ReadingKid className="-my-4 h-28 w-28 shrink-0 sm:-my-6 sm:h-40 sm:w-40" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat icon="📝" value={String(testsTaken)} label="Tests done" />
          <Stat icon="⭐" value={averagePercent === null ? "–" : `${averagePercent}%`} label="Average score" />
          <Stat icon="🎬" value={String(videosWatched)} label="Videos watched" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 px-1 text-xl font-semibold">Choose a subject</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SUBJECTS.map((item) => (
            <button
              key={item.subject}
              type="button"
              onClick={() => onSelectSubject(item.subject)}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${item.className}`}
            >
              <span className="pointer-events-none absolute -right-4 -top-4 flex gap-1 text-5xl opacity-25 transition group-hover:rotate-6" aria-hidden="true">
                {item.art.map((emoji) => (
                  <span key={emoji}>{emoji}</span>
                ))}
              </span>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 text-4xl ring-1 ring-white/40 backdrop-blur" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mt-5 block font-display text-2xl font-semibold">{item.subject}</span>
              <span className="mt-1 block text-sm font-semibold text-white/90">{item.tagline}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-sm font-bold text-slate-800 shadow-sm">
                Grades 1–5 <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 px-1 text-xs font-semibold text-slate-500">CBSE &amp; AP State Board syllabus</p>
      </section>
    </div>
  );
}
