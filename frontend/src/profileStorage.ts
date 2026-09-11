const STORAGE_KEY = "math_assistant_profile";

export interface ProfileStats {
  totalSeconds: number;
  lessonsCompleted: number;
  lastActive: number | null;
}

const DEFAULT_STATS: ProfileStats = { totalSeconds: 0, lessonsCompleted: 0, lastActive: null };

export function getProfileStats(): ProfileStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return {
      totalSeconds: typeof parsed.totalSeconds === "number" ? parsed.totalSeconds : 0,
      lessonsCompleted: typeof parsed.lessonsCompleted === "number" ? parsed.lessonsCompleted : 0,
      lastActive: typeof parsed.lastActive === "number" ? parsed.lastActive : null,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function recordCompletedLesson(durationSeconds: number, completedAt: number): ProfileStats {
  const current = getProfileStats();
  const updated: ProfileStats = {
    totalSeconds: current.totalSeconds + Math.max(0, Math.round(durationSeconds)),
    lessonsCompleted: current.lessonsCompleted + 1,
    lastActive: completedAt,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore write failures (private browsing, storage disabled, etc.) —
    // the in-memory app state still reflects the update for this session.
  }
  return updated;
}

export function resetProfileStats(): ProfileStats {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return { ...DEFAULT_STATS };
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
