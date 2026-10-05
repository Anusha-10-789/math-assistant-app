import { useState } from "react";
import { allConceptVideos, hasConceptVideos } from "../conceptVideos";
import { getProfileInfo } from "../profileInfo";
import { buildProgress, MASTERY_PERCENT, percentOf, type MasteryLevel, type ProgressReport, type TopicProgress } from "../progress";
import { displayTopic } from "../subjectModules";
import type { CompletedTest } from "../testHistory";
import type { WatchedVideos } from "../videoProgress";
import type { Subject } from "./SubjectSelect";

interface ProgressPageProps {
  history: CompletedTest[];
  watched: WatchedVideos;
  onBack: () => void;
  onPractice: (topic: string, subject: Subject) => void;
  onWatchVideos: (topic: string) => void;
}

const LEVELS: Record<MasteryLevel, { icon: string; label: string; className: string }> = {
  mastered: { icon: "⭐", label: "Mastered", className: "bg-emerald-100 text-emerald-800" },
  improving: { icon: "📈", label: "Getting there", className: "bg-amber-100 text-amber-800" },
  practice: { icon: "🔁", label: "Needs practice", className: "bg-rose-100 text-rose-800" },
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function LevelChip({ level }: { level: MasteryLevel }) {
  const { icon, label, className } = LEVELS[level];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// A plain-language paragraph a parent can read at a glance.
function parentSummary(report: ProgressReport): string {
  const name = getProfileInfo().name.trim();
  const who = name || "You";
  const has = name ? "has" : "have";
  const parts = [
    `${who} ${has} completed ${report.totalTests} ${report.totalTests === 1 ? "test" : "tests"} with an average score of ${report.averagePercent}%.`,
  ];
  if (report.lastWeek.tests > 0) {
    parts.push(`In the last 7 days: ${report.lastWeek.tests} ${report.lastWeek.tests === 1 ? "test" : "tests"}, averaging ${report.lastWeek.averagePercent}%.`);
  } else {
    parts.push("No tests in the last 7 days — a short practice session would help keep skills fresh.");
  }
  const mastered = report.topics.filter((t) => t.level === "mastered").map((t) => displayTopic(t.topic));
  const needsWork = report.topics.filter((t) => t.level === "practice").map((t) => displayTopic(t.topic));
  if (mastered.length) parts.push(`Strong in ${listNames(mastered)}.`);
  if (needsWork.length) parts.push(`Needs more practice in ${listNames(needsWork)}.`);
  else if (report.weakSkills.length) parts.push(`Could use a little more practice on ${listNames(report.weakSkills.slice(0, 3).map((s) => s.skill))}.`);
  return parts.join(" ");
}

function ScoreChart({ tests }: { tests: CompletedTest[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 640;
  const H = 220;
  const m = { top: 14, right: 14, bottom: 30, left: 40 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;
  const band = plotW / tests.length;
  const barW = Math.min(28, band * 0.6);
  const y = (percent: number) => m.top + plotH - (percent / 100) * plotH;
  const cx = (i: number) => m.left + band * i + band / 2;
  const active = hovered !== null ? tests[hovered] : null;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Quiz scores over time, as a percentage">
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={m.left} x2={W - m.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={m.left - 8} y={y(v) + 4} textAnchor="end" fontSize={12} fill="#64748b">
                {v}%
              </text>
            </g>
          ))}
          <line x1={m.left} x2={W - m.right} y1={y(MASTERY_PERCENT)} y2={y(MASTERY_PERCENT)} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" />
          <text x={W - m.right} y={y(MASTERY_PERCENT) - 5} textAnchor="end" fontSize={11} fill="#64748b">
            Mastery {MASTERY_PERCENT}%
          </text>

          {tests.map((test, i) => {
            const percent = percentOf(test);
            const top = y(percent);
            const h = Math.max(2, m.top + plotH - top);
            const r = Math.min(4, barW / 2, h);
            const x0 = cx(i) - barW / 2;
            const base = m.top + plotH;
            const path = `M ${x0} ${base} V ${base - h + r} Q ${x0} ${base - h} ${x0 + r} ${base - h} H ${x0 + barW - r} Q ${x0 + barW} ${base - h} ${x0 + barW} ${base - h + r} V ${base} Z`;
            return (
              <g key={test.id}>
                <path d={path} fill={hovered === i ? "#4338ca" : percent === 0 ? "#cbd5e1" : "#6366f1"} />
                <rect
                  x={m.left + band * i}
                  y={m.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${displayTopic(test.topic)}, ${formatDate(test.completedAt)}: ${percent}%`}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  className="cursor-pointer outline-none"
                />
              </g>
            );
          })}

          <text x={cx(0)} y={H - 8} textAnchor="start" fontSize={12} fill="#64748b">
            {formatDate(tests[0].completedAt)}
          </text>
          {tests.length > 1 && (
            <text x={cx(tests.length - 1)} y={H - 8} textAnchor="end" fontSize={12} fill="#64748b">
              {formatDate(tests[tests.length - 1].completedAt)}
            </text>
          )}
        </svg>

        {active && hovered !== null && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${(cx(hovered) / W) * 100}%`, top: `${(y(percentOf(active)) / H) * 100}%`, marginTop: -8 }}
          >
            <p className="font-semibold">{displayTopic(active.topic)}</p>
            <p className="text-slate-300">
              Grade {active.grade} · {formatDate(active.completedAt)}
            </p>
            <p className="mt-0.5 font-semibold">
              {active.score}/{active.total} · {percentOf(active)}%
            </p>
          </div>
        )}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-indigo-600 print:hidden">Show as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Topic</th>
              <th className="py-1 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {[...tests].reverse().map((test) => (
              <tr key={test.id} className="border-t border-slate-100">
                <td className="py-1">{formatDate(test.completedAt)}</td>
                <td className="py-1">
                  Grade {test.grade} · {displayTopic(test.topic)}
                </td>
                <td className="py-1 text-right">
                  {test.score}/{test.total} ({percentOf(test)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function TopicRow({ row, onPractice, onWatchVideos }: { row: TopicProgress; onPractice: () => void; onWatchVideos?: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-semibold text-slate-900">{displayTopic(row.topic)}</span>
        <LevelChip level={row.level} />
      </div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-200" title={`Recent average: ${row.recentPercent}%`}>
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${row.recentPercent}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>
            Recent: <span className="font-semibold text-slate-800">{row.recentPercent}%</span>
          </span>
          <span>
            Best: <span className="font-semibold text-slate-800">{row.bestPercent}%</span>
          </span>
          <span>
            Tests: <span className="font-semibold text-slate-800">{row.attempts}</span>
          </span>
          {row.trend !== null && row.trend !== 0 && (
            <span className={row.trend > 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
              {row.trend > 0 ? "▲" : "▼"} {Math.abs(row.trend)} pts since last test
            </span>
          )}
        </div>
        <div className="flex gap-2 print:hidden">
          {onWatchVideos && (
            <button type="button" onClick={onWatchVideos} className="rounded-lg border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
              🎬 Videos
            </button>
          )}
          <button type="button" onClick={onPractice} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700">
            Practice
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage({ history, watched, onBack, onPractice, onWatchVideos }: ProgressPageProps) {
  const report = buildProgress(history);
  // Hand-made videos plus AI-made ones (ids starting "ai-").
  const videosWatched = Object.keys(watched).length;
  const mastered = report.topics.filter((t) => t.level === "mastered").length;

  return (
    <div className="space-y-5 rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">My Progress</h2>
        <div className="flex gap-2 print:hidden">
          {report.totalTests > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              🖨️ Print for parents
            </button>
          )}
          <button type="button" onClick={onBack} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
            Back to lessons
          </button>
        </div>
      </div>

      {report.totalTests === 0 ? (
        <p className="text-sm text-slate-500">
          No tests yet. Finish a test and your scores, topic progress and practice suggestions will show up here.
          {videosWatched > 0 && ` You've already watched ${videosWatched} concept ${videosWatched === 1 ? "video" : "videos"} — great start!`}
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">Summary for parents</p>
            <p className="text-sm leading-relaxed text-slate-700">{parentSummary(report)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Tests taken" value={String(report.totalTests)} note={`${report.lastWeek.tests} this week`} />
            <StatTile label="Average score" value={`${report.averagePercent}%`} />
            <StatTile label="Topics mastered" value={`${mastered} / ${report.topics.length}`} />
            <StatTile label="Videos watched" value={String(videosWatched)} note={`${allConceptVideos().length} ready-made + any topic on request`} />
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Quiz scores{report.timeline.length < report.totalTests ? ` (last ${report.timeline.length})` : ""}</h3>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <ScoreChart tests={report.timeline} />
            </div>
          </section>

          {(report.weakSkills.length > 0 || report.strongSkills.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">🔁 Needs more practice</h3>
                {report.weakSkills.length === 0 ? (
                  <p className="text-sm text-slate-500">Nothing stands out — keep it up!</p>
                ) : (
                  <ul className="space-y-2">
                    {report.weakSkills.map((skill) => (
                      <li key={skill.skill} className="flex items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm">
                        <span>
                          <span className="block font-semibold text-slate-900">{skill.skill}</span>
                          <span className="text-xs text-slate-600">
                            {skill.correct} of {skill.total} right ({skill.percent}%)
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onPractice(skill.practiceTopic, report.topics.find((t) => t.topic === skill.practiceTopic)?.subject ?? "Mathematics")}
                          className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 print:hidden"
                        >
                          Practice
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">⭐ Strengths</h3>
                {report.strongSkills.length === 0 ? (
                  <p className="text-sm text-slate-500">Strengths show up after a few more correct answers.</p>
                ) : (
                  <ul className="space-y-2">
                    {report.strongSkills.map((skill) => (
                      <li key={skill.skill} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                        <span className="block font-semibold text-slate-900">{skill.skill}</span>
                        <span className="text-xs text-slate-600">
                          {skill.correct} of {skill.total} right ({skill.percent}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Progress by topic</h3>
            <p className="mb-2 text-xs text-slate-500">
              Based on the average of the last 3 tests in each topic. ⭐ {MASTERY_PERCENT}%+ is mastered, 📈 50–79% is getting there, 🔁 below 50% needs practice.
            </p>
            <div className="space-y-3">
              {report.topics.map((row) => (
                <TopicRow
                  key={row.topic}
                  row={row}
                  onPractice={() => onPractice(row.topic, row.subject)}
                  onWatchVideos={
                    hasConceptVideos(row.topic)
                      ? () => onWatchVideos(row.topic)
                      : row.topic.startsWith("Mixed Review")
                        ? undefined
                        : // The topic screen offers an AI-made video for topics without hand-made ones.
                          () => onPractice(row.topic, row.subject)
                  }
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
