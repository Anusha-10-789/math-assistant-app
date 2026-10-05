import { getStoredCredentials } from "./auth";

// Before progress was saved per account, every student on a device shared
// this one key; it's now only read once, to carry those videos over.
const LEGACY_STORAGE_KEY = "math_assistant_watched_videos";

// Each student on a shared device gets their own copy.
function storageKey(): string {
  const user = getStoredCredentials()?.username.trim().toLowerCase();
  return user ? `${LEGACY_STORAGE_KEY}:${user}` : LEGACY_STORAGE_KEY;
}

function readWatched(key: string): WatchedVideos {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export interface WatchedVideo {
  timesWatched: number;
  lastWatched: number;
}

export type WatchedVideos = Record<string, WatchedVideo>;

export function getWatchedVideos(): WatchedVideos {
  return readWatched(storageKey());
}

// Combines two records of watched videos, keeping the higher count and the
// latest watch time for each — used when syncing with the account.
export function mergeWatchedVideos(a: WatchedVideos, b: WatchedVideos): WatchedVideos {
  const merged: WatchedVideos = { ...a };
  for (const [id, video] of Object.entries(b)) {
    const existing = merged[id];
    merged[id] = existing
      ? { timesWatched: Math.max(existing.timesWatched, video.timesWatched), lastWatched: Math.max(existing.lastWatched, video.lastWatched) }
      : video;
  }
  return merged;
}

// This device's videos plus, once, any from the old shared key.
export function takeLocalWatchedVideos(): WatchedVideos {
  const legacy = readWatched(LEGACY_STORAGE_KEY);
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
  return mergeWatchedVideos(getWatchedVideos(), legacy);
}

export function replaceWatchedVideos(watched: WatchedVideos): WatchedVideos {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(watched));
  } catch {
    // ignore
  }
  return watched;
}

export function markVideoWatched(videoId: string, watchedAt = Date.now()): WatchedVideos {
  const current = getWatchedVideos();
  const updated: WatchedVideos = {
    ...current,
    [videoId]: { timesWatched: (current[videoId]?.timesWatched ?? 0) + 1, lastWatched: watchedAt },
  };
  return replaceWatchedVideos(updated);
}

export function clearWatchedVideos(): WatchedVideos {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    // ignore
  }
  return {};
}
