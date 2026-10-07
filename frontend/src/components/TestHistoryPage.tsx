import { useState } from "react";
import type { MyAssignment } from "../api";
import { displayTopic } from "../subjectModules";
import type { CompletedTest } from "../testHistory";

type ReportFormat = "pdf" | "docx";

interface TestHistoryPageProps {
  history: CompletedTest[];
  onBack: () => void;
  onClear: () => void;
  onDownload: (test: CompletedTest, format: ReportFormat) => Promise<void>;
  assignments: MyAssignment[];
  onStartAssignment: (assignment: MyAssignment) => void;
}

function dueLabel(due: string): { text: string; late: boolean } {
  if (!due) return { text: "", late: false };
  const today = new Date().toISOString().slice(0, 10);
  const date = new Date(`${due}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return { text: due < today ? `Was due ${date}` : due === today ? "Due today" : `Due ${date}`, late: due < today };
}

// Tests the teacher assigned: to-do ones first with Start, then finished ones with the score.
function AssignedTests({ assignments, onStart }: { assignments: MyAssignment[]; onStart: (a: MyAssignment) => void }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-lg font-semibold">📋 Assigned to you</h3>
      <ul className="space-y-2">
        {assignments.map((a) => {
          const due = dueLabel(a.due);
          return (
            <li
              key={a.id}
              className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${a.result ? "border-slate-200 bg-slate-50" : "border-indigo-200 bg-indigo-50/60"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-slate-900">{a.topic}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {a.subject === "Science" ? "Science" : "Maths"} · Grade {a.grade} · {a.num_questions} questions
                  {due.text && <span className={due.late && !a.result ? " font-bold text-rose-600" : ""}> · {due.text}</span>}
                </p>
                {a.note && <p className="mt-1 text-sm text-slate-600">“{a.note}”</p>}
              </div>
              {a.result ? (
                <span className="self-start rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800 sm:self-center">
                  ✓ Done · {a.result.score}/{a.result.total}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onStart(a)}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-300/50 hover:bg-indigo-700"
                >
                  ▶ Start test
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function scoreClass(percent: number): string {
  if (percent >= 80) return "bg-emerald-100 text-emerald-800";
  if (percent >= 50) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export default function TestHistoryPage({ history, onBack, onClear, onDownload, assignments, onStartAssignment }: TestHistoryPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Which download is in progress ("<test id>:pdf"), and a failed one's message.
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ id: string; message: string } | null>(null);

  async function download(test: CompletedTest, format: ReportFormat) {
    setDownloadError(null);
    setDownloading(`${test.id}:${format}`);
    try {
      await onDownload(test, format);
    } catch (err) {
      setDownloadError({ id: test.id, message: err instanceof Error ? err.message : "Couldn't download the summary. Please try again." });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">My Tests</h2>
          <p className="text-sm text-slate-500">Revise any test, or download its summary as a PDF or Word file.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          🏠 <span className="hidden sm:inline">Back to </span>Home
        </button>
      </div>

      {assignments.length > 0 && <AssignedTests assignments={assignments} onStart={onStartAssignment} />}

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
              <div key={test.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : test.id)}
                    aria-expanded={isExpanded}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-semibold text-slate-900">{displayTopic(test.topic)}</span>
                      <span className="block text-xs font-semibold text-slate-500">
                        Grade {test.grade} · {formatDate(test.completedAt)}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreClass(percent)}`}>
                        {test.score}/{test.total} · {percent}%
                      </span>
                      <span className="text-slate-400" aria-hidden="true">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </span>
                  </button>
                  <div className="flex gap-2 sm:ml-2" role="group" aria-label={`Download summary of ${displayTopic(test.topic)}`}>
                    {(["pdf", "docx"] as ReportFormat[]).map((format) => {
                      const busy = downloading === `${test.id}:${format}`;
                      return (
                        <button
                          key={format}
                          type="button"
                          onClick={() => download(test, format)}
                          disabled={downloading !== null}
                          title={`Download test summary as ${format === "pdf" ? "PDF" : "Word"}`}
                          className="flex-1 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
                        >
                          {busy ? "⏳ Saving…" : format === "pdf" ? "⬇ PDF" : "⬇ Word"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {downloadError?.id === test.id && <p className="px-4 pb-3 text-sm text-rose-600">{downloadError.message}</p>}

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
