import { getAllTopicsModule, getTopicModules } from "../subjectModules";
import type { Subject } from "./SubjectSelect";

interface TopicSelectProps {
  subject: Subject;
  topic: string;
  onTopicChange: (value: string) => void;
  onModuleSelect: (topic: string) => void;
  onNext: () => void;
}

export default function TopicSelect({ subject, topic, onTopicChange, onModuleSelect, onNext }: TopicSelectProps) {
  const modules = getTopicModules(subject);
  const allTopicsModule = getAllTopicsModule(subject);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      onNext();
    }
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <p className="mb-3 block text-sm font-medium text-slate-700">{subject} topic modules</p>
      <div className="mb-4 space-y-3">
        {modules.map((module) => (
          <button
            key={module.label}
            type="button"
            onClick={() => onModuleSelect(module.topic)}
            className="flex w-full items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-left transition hover:bg-indigo-100"
          >
            <span className="text-3xl leading-none">{module.icon}</span>
            <span>
              <span className="block font-bold text-indigo-700">{module.label}</span>
              <span className="block text-xs text-slate-500">{module.description}</span>
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => onModuleSelect(allTopicsModule.topic)}
          className="flex w-full items-center gap-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-left transition hover:bg-amber-100"
        >
          <span className="text-3xl leading-none">{allTopicsModule.icon}</span>
          <span>
            <span className="block font-bold text-amber-700">{allTopicsModule.label}</span>
            <span className="block text-xs text-slate-500">{allTopicsModule.description}</span>
          </span>
        </button>
      </div>

      <label htmlFor="topic-input" className="mb-2 block text-sm font-medium text-slate-700">
        Or type your own {subject.toLowerCase()} topic or question
      </label>
      <input
        id="topic-input"
        type="text"
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          subject === "Science"
            ? "e.g. Plants, or How do animals breathe?"
            : "e.g. Multiplication tables, or What is a fraction?"
        }
        className="mb-4 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Next →
      </button>
    </div>
  );
}
