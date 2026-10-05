import { fetchProgress, saveProgress, type SavedProgress } from "./api";
import { getTestHistory, markTestsSynced, replaceTestHistory, takeLocalOnlyTests } from "./testHistory";
import { getWatchedVideos, mergeWatchedVideos, replaceWatchedVideos, takeLocalWatchedVideos } from "./videoProgress";

// Progress lives in the student's account (so it follows them to any device
// and parents see the same report everywhere), with a copy on this device so
// the app works offline and opens instantly.

const SAVE_DELAY_MS = 1000;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function pushNow(): Promise<void> {
  const progress = { history: getTestHistory(), watched: getWatchedVideos() };
  await saveProgress(progress);
  markTestsSynced(progress.history.map((test) => test.id));
}

// Called after every change; batched so a burst of changes is one save. A
// failed save is retried on the next change or login — the tests stay
// marked unsynced until then.
export function scheduleProgressSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    pushNow().catch(() => {});
  }, SAVE_DELAY_MS);
}

// After login: the account's progress, plus anything this device recorded
// that the account doesn't have yet.
export async function syncProgress(): Promise<SavedProgress> {
  const server = await fetchProgress();
  const localTests = takeLocalOnlyTests();
  const history = replaceTestHistory([...server.history, ...localTests]);
  const watched = replaceWatchedVideos(mergeWatchedVideos(server.watched, takeLocalWatchedVideos()));
  const changed = localTests.length > 0 || JSON.stringify(watched) !== JSON.stringify(server.watched);
  if (changed) await pushNow();
  return { history, watched };
}
