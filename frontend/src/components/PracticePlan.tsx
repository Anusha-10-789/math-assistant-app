import type { TopicProgress } from "../progress";
import { displayTopic } from "../subjectModules";

interface PracticePlanProps {
  // Weak topics, weakest first (see weakTopics in progress.ts).
  topics: TopicProgress[];
  onWatchClass: (topic: TopicProgress) => void;
  onPracticeTest: (topic: TopicProgress) => void;
  // Show only the first few, with a link to the rest.
  limit?: number;
  onSeeAll?: () => void;
  title?: string;
  subtitle?: string;
  // Inside another card (My Progress): no card of its own.
  embedded?: boolean;
}

function levelStyle(percent: number): { chip: string; bar: string; label: string } {
  if (percent < 50) return { chip: "bg-rose-100 text-rose-800", bar: "bg-rose-400", label: "🔁 Needs practice" };
  return { chip: "bg-amber-100 text-amber-800", bar: "bg-amber-400", label: "📈 Getting there" };
}

// A practice plan built from the student's test averages: for every topic
// that isn't mastered yet, a class to re-learn it and a fresh practice test.
export default function PracticePlan({
  topics,
  onWatchClass,
  onPracticeTest,
  limit,
  onSeeAll,
  title = "📚 Your practice plan",
  subtitle = "Based on your test averages — watch the class, then take a practice test to get stronger.",
  embedded = false,
}: PracticePlanProps) {
  const shown = limit ? topics.slice(0, limit) : topics;
  const hidden = topics.length - shown.length;

  return (
    <section className={embedded ? "" : "rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200/70 sm:p-6"}>
      <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">{subtitle}</p>

      <ol className="space-y-3">
        {shown.map((topic, index) => {
          const style = levelStyle(topic.recentPercent);
          return (
            <li key={topic.topic} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-display text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold leading-snug text-slate-900">{displayTopic(topic.topic)}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Grade {topic.grade} · {topic.subject === "Science" ? "Science" : "Maths"} · {topic.attempts} {topic.attempts === 1 ? "test" : "tests"}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${style.chip}`}>{style.label}</span>
              </div>

              <div className="mb-3 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.max(4, topic.recentPercent)}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-bold text-slate-700">Average {topic.recentPercent}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onWatchClass(topic)}
                  className="rounded-xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-sm font-bold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50"
                >
                  ▶ Watch the class
                </button>
                <button
                  type="button"
                  onClick={() => onPracticeTest(topic)}
                  className="rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-300/50 hover:bg-indigo-700"
                >
                  📝 Practice test
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {hidden > 0 && onSeeAll && (
        <button type="button" onClick={onSeeAll} className="mt-3 text-sm font-bold text-indigo-600 hover:underline">
          See {hidden} more {hidden === 1 ? "topic" : "topics"} →
        </button>
      )}
    </section>
  );
}
