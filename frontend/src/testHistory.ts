import { getStoredCredentials } from "./auth";
import type { QuizResult } from "./components/QuizPlayer";
import type { Subject } from "./components/SubjectSelect";
import type { MCQItem } from "./types";

// Before progress was saved per account, every student on a device shared
// this one key; it's now only read once, to carry those tests over.
const LEGACY_STORAGE_KEY = "math_assistant_test_history";
// Ids of tests not yet saved to the student's account (finished offline or
// before a save went through) — merged into the account on the next sync.
const UNSYNCED_KEY = "math_assistant_unsynced_tests";

// Each student on a shared device gets their own copy.
function userKey(base: string): string {
  const user = getStoredCredentials()?.username.trim().toLowerCase();
  return user ? `${base}:${user}` : base;
}
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
  // Missing on tests saved before it was recorded (see subjectForTopic).
  subject?: Subject;
}

function readHistory(key: string): CompletedTest[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // durationSeconds didn't exist in entries recorded before this field was
    // added — default those to 0 rather than letting them poison the
    // time totals with `undefined`/NaN.
    return parsed.map((entry) => ({
      ...entry,
      durationSeconds: typeof entry.durationSeconds === "number" ? entry.durationSeconds : 0,
    }));
  } catch {
    return [];
  }
}

export function getTestHistory(): CompletedTest[] {
  return readHistory(userKey(LEGACY_STORAGE_KEY));
}

function writeHistory(history: CompletedTest[]): void {
  try {
    localStorage.setItem(userKey(LEGACY_STORAGE_KEY), JSON.stringify(history));
  } catch {
    // Ignore write failures (private browsing, storage quota, etc.) — the
    // in-memory app state still reflects the update for this session.
  }
}

function readUnsynced(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(userKey(UNSYNCED_KEY)) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUnsynced(ids: string[]): void {
  try {
    if (ids.length) localStorage.setItem(userKey(UNSYNCED_KEY), JSON.stringify(ids));
    else localStorage.removeItem(userKey(UNSYNCED_KEY));
  } catch {
    // ignore
  }
}

// Tests this device has that the account doesn't yet: unsynced ones plus,
// once, any from the old shared key (which is then removed).
export function takeLocalOnlyTests(): CompletedTest[] {
  const unsynced = new Set(readUnsynced());
  const local = getTestHistory().filter((test) => unsynced.has(test.id));
  const legacy = readHistory(LEGACY_STORAGE_KEY);
  if (legacy.length) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return [...local, ...legacy];
}

export function markTestsSynced(ids: string[]): void {
  const synced = new Set(ids);
  writeUnsynced(readUnsynced().filter((id) => !synced.has(id)));
}

// Newest first, no duplicates, capped like recordCompletedTest.
export function replaceTestHistory(history: CompletedTest[]): CompletedTest[] {
  const seen = new Set<string>();
  const merged = [...history]
    .sort((a, b) => b.completedAt - a.completedAt)
    .filter((test) => !seen.has(test.id) && seen.add(test.id))
    .slice(0, MAX_HISTORY_ENTRIES);
  writeHistory(merged);
  return merged;
}

export function recordCompletedTest(entry: Omit<CompletedTest, "id">): CompletedTest[] {
  const record: CompletedTest = {
    ...entry,
    id: `${entry.completedAt}-${Math.random().toString(36).slice(2, 8)}`,
  };

  const updated = [record, ...getTestHistory()].slice(0, MAX_HISTORY_ENTRIES);
  writeHistory(updated);
  writeUnsynced([...readUnsynced(), record.id]);
  return updated;
}

export function clearTestHistory(): CompletedTest[] {
  try {
    localStorage.removeItem(userKey(LEGACY_STORAGE_KEY));
    localStorage.removeItem(userKey(UNSYNCED_KEY));
  } catch {
    // ignore
  }
  return [];
}
