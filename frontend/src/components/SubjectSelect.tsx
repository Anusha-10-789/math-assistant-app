import type { Subject } from "../subjects";

export type { Subject };

interface SubjectSelectProps {
  onSelectSubject: (subject: Subject) => void;
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
  {
    subject: "Social Studies",
    icon: "🌏",
    tagline: "Family, community, maps, India and the world",
    art: ["🗺️", "🏛️", "🧭"],
    className: "from-amber-400 via-orange-500 to-red-500 shadow-orange-300/60",
  },
];

export default function SubjectSelect({ onSelectSubject }: SubjectSelectProps) {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-4 px-1 text-2xl font-semibold sm:text-3xl">Choose a subject</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>
    </div>
  );
}
