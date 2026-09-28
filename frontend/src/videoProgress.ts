const STORAGE_KEY = "math_assistant_watched_videos";

export interface WatchedVideo {
  timesWatched: number;
  lastWatched: number;
}

export type WatchedVideos = Record<string, WatchedVideo>;

export function getWatchedVideos(): WatchedVideos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function markVideoWatched(videoId: string, watchedAt = Date.now()): WatchedVideos {
  const current = getWatchedVideos();
  const updated: WatchedVideos = {
    ...current,
    [videoId]: { timesWatched: (current[videoId]?.timesWatched ?? 0) + 1, lastWatched: watchedAt },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore write failures (private browsing, storage quota, etc.).
  }
  return updated;
}

export function clearWatchedVideos(): WatchedVideos {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return {};
}
