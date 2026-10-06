import { GRADES, getAllTopicsModule, getGradeTopicModules } from "../subjectModules";
import type { Subject } from "./SubjectSelect";

interface TopicSelectProps {
  subject: Subject;
  grade: number;
  onGradeChange: (grade: number) => void;
  topic: string;
  onTopicChange: (value: string) => void;
  onModuleSelect: (topic: string) => void;
  onNext: () => void;
  onBack: () => void;
}

// Soft tints cycled across the topic icons so the grid feels colourful.
const ICON_TINTS = ["bg-amber-100", "bg-sky-100", "bg-emerald-100", "bg-pink-100", "bg-violet-100", "bg-orange-100", "bg-teal-100", "bg-rose-100"];

export default function TopicSelect({
  subject,
  grade,
  onGradeChange,
  topic,
  onTopicChange,
  onModuleSelect,
  onNext,
  onBack,
}: TopicSelectProps) {
  const modules = getGradeTopicModules(subject, grade);
  const allTopicsModule = getAllTopicsModule(subject);
  const isScience = subject === "Science";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      onNext();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Change subject"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-indigo-700"
        >
          ←
        </button>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">{isScience ? "🔬 Science" : "🧮 Mathematics"}</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Pick a topic</h1>
        </div>
      </div>

      <div>
        <div className="flex w-full gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:inline-flex sm:w-auto" role="tablist" aria-label="Grade">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={g === grade}
              onClick={() => onGradeChange(g)}
              aria-label={`Grade ${g}`}
              className={`flex-1 whitespace-nowrap rounded-full px-2 py-2 text-sm font-bold sm:flex-none sm:px-4 ${
                g === grade ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/50" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <span className="hidden sm:inline">Grade </span>
              <span className="sm:hidden">Gr </span>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modules.map((module, index) => (
          <button
            key={module.topic}
            type="button"
            onClick={() => onModuleSelect(module.topic)}
            className="tile group flex w-full items-center gap-4 p-4 text-left"
          >
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl leading-none ${ICON_TINTS[index % ICON_TINTS.length]}`}
              aria-hidden="true"
            >
              {module.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-semibold leading-snug text-slate-900">{module.label}</span>
              <span className="block text-sm text-slate-500">{module.description}</span>
            </span>
            <span className="text-xl text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" aria-hidden="true">
              ›
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => onModuleSelect(allTopicsModule.topic)}
          className="group flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 p-4 text-left shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-lg sm:col-span-2"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/40 text-3xl leading-none" aria-hidden="true">
            {allTopicsModule.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold text-amber-950">{allTopicsModule.label}</span>
            <span className="block text-sm font-semibold text-amber-900/80">{allTopicsModule.description}</span>
          </span>
          <span className="text-xl text-amber-900/60 transition group-hover:translate-x-0.5" aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <label htmlFor="topic-input" className="mb-2 block font-display text-base font-semibold text-slate-900">
          ✏️ Or ask about anything in {subject.toLowerCase()}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="topic-input"
            type="text"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isScience ? "e.g. How do animals breathe?" : "e.g. What is a fraction?"}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-md shadow-indigo-300/50 hover:bg-indigo-700"
          >
            Go →
          </button>
        </div>
      </div>
    </div>
  );
}
