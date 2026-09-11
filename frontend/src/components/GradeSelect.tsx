interface GradeSelectProps {
  topic: string;
  grade: number;
  onGradeChange: (value: number) => void;
  numQuestions: number;
  onNumQuestionsChange: (value: number) => void;
  onBack: () => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function GradeSelect({
  topic,
  grade,
  onGradeChange,
  numQuestions,
  onNumQuestionsChange,
  onBack,
  onGenerate,
  loading,
}: GradeSelectProps) {
  function handleNumQuestionsChange(raw: string) {
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    onNumQuestionsChange(Math.min(50, Math.max(1, value)));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="mb-4 text-sm font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        ← Back to topics
      </button>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Topic</p>
      <p className="mb-4 text-lg font-bold text-slate-900">{topic}</p>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="grade-select" className="mb-2 block text-sm font-medium text-slate-700">
            Grade
          </label>
          <select
            id="grade-select"
            value={grade}
            onChange={(e) => onGradeChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {[1, 2, 3, 4, 5].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="num-questions" className="mb-2 block text-sm font-medium text-slate-700">
            Number of questions (1-50)
          </label>
          <input
            id="num-questions"
            type="number"
            min={1}
            max={50}
            value={numQuestions}
            onChange={(e) => handleNumQuestionsChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>
  );
}
