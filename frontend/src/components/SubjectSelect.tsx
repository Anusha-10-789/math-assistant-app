export type Subject = "Mathematics" | "Science";

interface SubjectSelectProps {
  onSelectSubject: (subject: Subject) => void;
}

const SUBJECTS: Array<{ subject: Subject; icon: string; description: string }> = [
  { subject: "Mathematics", icon: "🧮", description: "Grades 1-5 · CBSE & AP State Board syllabus" },
  { subject: "Science", icon: "🔬", description: "Grades 1-5 · CBSE & AP State Board syllabus" },
];

export default function SubjectSelect({ onSelectSubject }: SubjectSelectProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-indigo-100 backdrop-blur">
      <h2 className="mb-4 text-center text-sm font-semibold text-slate-700">Choose a subject</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SUBJECTS.map((item) => (
          <button
            key={item.subject}
            type="button"
            onClick={() => onSelectSubject(item.subject)}
            className="flex flex-col items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-8 text-center transition hover:bg-indigo-100"
          >
            <span className="text-4xl leading-none">{item.icon}</span>
            <span className="text-lg font-bold text-indigo-700">{item.subject}</span>
            <span className="text-xs text-slate-500">{item.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
