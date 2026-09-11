import type { QuizResult } from "./components/QuizPlayer";
import type { MCQItem } from "./types";
import { getAllottedMinutes } from "./topicTimeConfig";

const STORAGE_KEY = "math_assistant_test_history";
// Caps local storage growth — each entry stores the full question set for
// revision, so this bounds worst-case size to a few MB even after months of use.
const MAX_HISTORY_ENTRIES = 50;

export interface CompletedTest {
  id: string;
  topic: string;
  grade: number;
  completedAt: number;
  score: number;
  total: number;
  durationSeconds: number;
  mcqs: MCQItem[];
  missed: QuizResult["missed"];
}

export interface TopicAttendance {
  topic: string;
  allottedMinutes: number;
  spentSeconds: number;
  sessionCount: number;
  lastActive: number;
}

export function getTestHistory(): CompletedTest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // durationSeconds didn't exist in entries recorded before this field was
    // added — default those to 0 rather than letting them poison the
    // Attendance page's totals with `undefined`/NaN.
    return parsed.map((entry) => ({
      ...entry,
      durationSeconds: typeof entry.durationSeconds === "number" ? entry.durationSeconds : 0,
    }));
  } catch {
    return [];
  }
}

export function getTopicAttendance(): TopicAttendance[] {
  const byTopic = new Map<string, TopicAttendance>();
  for (const test of getTestHistory()) {
    const existing = byTopic.get(test.topic);
    if (existing) {
      existing.spentSeconds += test.durationSeconds;
      existing.sessionCount += 1;
      existing.lastActive = Math.max(existing.lastActive, test.completedAt);
    } else {
      byTopic.set(test.topic, {
        topic: test.topic,
        allottedMinutes: getAllottedMinutes(test.topic),
        spentSeconds: test.durationSeconds,
        sessionCount: 1,
        lastActive: test.completedAt,
      });
    }
  }
  return Array.from(byTopic.values()).sort((a, b) => b.lastActive - a.lastActive);
}

export function recordCompletedTest(entry: Omit<CompletedTest, "id">): CompletedTest[] {
  const record: CompletedTest = {
    ...entry,
    id: `${entry.completedAt}-${Math.random().toString(36).slice(2, 8)}`,
  };

  const updated = [record, ...getTestHistory()].slice(0, MAX_HISTORY_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore write failures (private browsing, storage quota, etc.) — the
    // in-memory app state still reflects the update for this session.
  }
  return updated;
}

export function clearTestHistory(): CompletedTest[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return [];
}
