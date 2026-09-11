import { useState } from "react";
import type { CompletedTest } from "../testHistory";

interface TestHistoryPageProps {
  history: CompletedTest[];
  onBack: () => void;
  onClear: () => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function TestHistoryPage({ history, onBack, onClear }: TestHistoryPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-indigo-100 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Completed Tests</h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Back to lessons
        </button>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-slate-500">
          No completed tests yet. Finish a test and it will show up here for revision.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((test) => {
            const percent = Math.round((test.score / test.total) * 100);
            const isExpanded = expandedId === test.id;

            return (
              <div key={test.id} className="rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : test.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">
                      Grade {test.grade} · {test.topic}
                    </span>
                    <span className="block text-xs text-slate-500">{formatDate(test.completedAt)}</span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-3">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      {test.score}/{test.total} ({percent}%)
                    </span>
                    <span className="text-slate-400">{isExpanded ? "▲" : "▼"}</span>
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t border-slate-100 p-4">
                    {test.mcqs.map((mcq) => {
                      const missedEntry = test.missed.find(
                        (item) => item.questionNumber === mcq.question_number,
                      );
                      const options: Record<(typeof OPTION_LETTERS)[number], string> = {
                        A: mcq.option_a,
                        B: mcq.option_b,
                        C: mcq.option_c,
                        D: mcq.option_d,
                      };

                      return (
                        <div key={mcq.question_number} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="mb-1 font-semibold text-slate-900">
                            Q.{mcq.question_number}) {mcq.topic}: {mcq.question}
                          </p>
                          <div className="mb-1 space-y-0.5">
                            {OPTION_LETTERS.map((letter) => (
                              <p
                                key={letter}
                                className={
                                  letter === mcq.correct_answer
                                    ? "font-semibold text-green-700"
                                    : "text-slate-600"
                                }
                              >
                                {letter}) {options[letter]}
                              </p>
                            ))}
                          </div>
                          {missedEntry && (
                            <p className="mb-1 text-red-700">
                              You answered:{" "}
                              {missedEntry.yourAnswer
                                ? `${missedEntry.yourAnswer}) ${options[missedEntry.yourAnswer as (typeof OPTION_LETTERS)[number]] ?? ""}`
                                : "(skipped)"}
                            </p>
                          )}
                          <p className="text-slate-700">{mcq.explanation}</p>
                          <p className="text-amber-700">
                            <span className="font-semibold">Trick:</span> {mcq.trick}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Clear history
        </button>
      )}
    </div>
  );
}
