import { useEffect, useRef, useState } from "react";

interface TopicIntroPlayerProps {
  topic: string;
  onContinue: () => void;
  onBack: () => void;
  onFetchVideo: (topic: string) => Promise<Blob>;
}

type VideoState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

const ESTIMATED_INTRO_SECONDS = 20;

export default function TopicIntroPlayer({ topic, onContinue, onBack, onFetchVideo }: TopicIntroPlayerProps) {
  const [videoState, setVideoState] = useState<VideoState>({ status: "loading" });
  const [hasWatchedVideo, setHasWatchedVideo] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (videoState.status !== "loading") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [videoState.status]);

  async function handleWatchVideo() {
    const requestId = ++requestIdRef.current;
    setVideoState({ status: "loading" });
    try {
      const blob = await onFetchVideo(topic);
      if (requestIdRef.current !== requestId) return;
      const url = URL.createObjectURL(blob);
      setVideoState({ status: "ready", url });
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setVideoState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load the introduction video.",
      });
    }
  }

  useEffect(() => {
    handleWatchVideo();
    // Runs once per topic: App.tsx remounts this component (via `key`) each
    // time a new topic is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleVideoElementError(event: React.SyntheticEvent<HTMLVideoElement>) {
    const mediaError = event.currentTarget.error;
    const reasons: Record<number, string> = {
      1: "playback was aborted",
      2: "a network error interrupted loading",
      3: "the browser could not decode this video/audio",
      4: "this video format isn't supported by your browser",
    };
    const reason = mediaError ? reasons[mediaError.code] ?? "an unknown playback error occurred" : "an unknown playback error occurred";
    setVideoState({
      status: "error",
      message: `The video failed to play (${reason}). Try again below.`,
    });
  }

  const videoProgressPercent = Math.min(96, (elapsedSeconds / ESTIMATED_INTRO_SECONDS) * 100);

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-medium text-indigo-600 hover:underline"
      >
        ← Back to topics
      </button>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Topic Introduction
      </p>
      <h2 className="mb-4 text-lg font-bold text-slate-900">What is {topic}?</h2>

      <div className="mb-4">
        {videoState.status === "loading" && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              <span>Loading the introduction video... {elapsedSeconds}s elapsed</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-linear"
                style={{ width: `${videoProgressPercent}%` }}
              />
            </div>
          </div>
        )}
        {videoState.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="mb-2">{videoState.message}</p>
            <button
              type="button"
              onClick={handleWatchVideo}
              className="text-xs font-semibold text-red-700 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
        {videoState.status === "ready" && (
          <div>
            <video
              controls
              src={videoState.url}
              onError={handleVideoElementError}
              onEnded={() => setHasWatchedVideo(true)}
              className="w-full rounded-lg border border-slate-200"
            />
            {!hasWatchedVideo && (
              <p className="mt-2 text-xs text-indigo-600">
                Watch the whole video to continue — the Continue button below will unlock once it
                finishes.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!hasWatchedVideo}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
