import type { TopicAttendance } from "../testHistory";

interface AttendancePageProps {
  attendance: TopicAttendance[];
  onBack: () => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function formatSpent(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function AttendancePage({ attendance, onBack }: AttendancePageProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-indigo-100 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Attendance</h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Back to lessons
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Recommended time per topic, and how much you've actually spent so far across completed
        tests. These are guides, not limits — nothing stops or locks when time is up.
      </p>

      {attendance.length === 0 ? (
        <p className="text-sm text-slate-500">
          No completed tests yet. Finish a test and its topic will show up here.
        </p>
      ) : (
        <div className="space-y-3">
          {attendance.map((row) => {
            const spentMinutes = row.spentSeconds / 60;
            const percent = Math.min(100, Math.round((spentMinutes / row.allottedMinutes) * 100));
            const overAllotted = spentMinutes > row.allottedMinutes;

            return (
              <div key={row.topic} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{row.topic}</span>
                  <span className="text-xs text-slate-500">Last: {formatDate(row.lastActive)}</span>
                </div>

                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${overAllotted ? "bg-amber-500" : "bg-indigo-500"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span>
                    Spent: <span className="font-semibold text-slate-800">{formatSpent(row.spentSeconds)}</span>
                  </span>
                  <span>
                    Allotted: <span className="font-semibold text-slate-800">{row.allottedMinutes}m</span> / session
                  </span>
                  <span>
                    Sessions: <span className="font-semibold text-slate-800">{row.sessionCount}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
