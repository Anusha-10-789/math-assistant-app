import { displayTopic } from "../subjectModules";

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

const QUICK_COUNTS = [5, 10, 20, 30];

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
  function setCount(value: number) {
    if (Number.isNaN(value)) return;
    onNumQuestionsChange(Math.min(50, Math.max(1, value)));
  }

  const pill = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-bold ${
      active ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/50" : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
    }`;

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200/70">
      <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-5 pb-6 pt-4 text-white sm:px-7">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="mb-4 rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Topics
        </button>
        <p className="text-xs font-bold uppercase tracking-wider text-white/80">Get ready for your test</p>
        <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{displayTopic(topic)}</h1>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <fieldset>
          <legend className="mb-2 font-display text-base font-semibold text-slate-900">Your grade</legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((g) => (
              <button key={g} type="button" aria-pressed={g === grade} onClick={() => onGradeChange(g)} className={pill(g === grade)}>
                Grade {g}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-display text-base font-semibold text-slate-900">How many questions?</legend>
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_COUNTS.map((count) => (
              <button key={count} type="button" aria-pressed={count === numQuestions} onClick={() => setCount(count)} className={pill(count === numQuestions)}>
                {count}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setCount(numQuestions - 1)}
                aria-label="Fewer questions"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-700 shadow-sm hover:text-indigo-700"
              >
                −
              </button>
              <input
                id="num-questions"
                type="number"
                min={1}
                max={50}
                value={numQuestions}
                onChange={(e) => setCount(Number(e.target.value))}
                aria-label="Number of questions (1-50)"
                className="w-12 bg-transparent text-center font-display text-lg font-semibold text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setCount(numQuestions + 1)}
                aria-label="More questions"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-700 shadow-sm hover:text-indigo-700"
              >
                +
              </button>
            </div>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="w-full rounded-2xl bg-emerald-500 px-8 py-4 font-display text-xl font-semibold text-white shadow-[0_5px_0_0_#047857] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Getting ready…" : "▶  Start the test"}
        </button>
      </div>
    </div>
  );
}
