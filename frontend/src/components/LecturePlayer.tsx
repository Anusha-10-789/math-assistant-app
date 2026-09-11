import { useEffect, useRef, useState } from "react";
import type { LessonContent } from "../types";
import VisualAid from "./VisualAid";

interface LecturePlayerProps {
  lesson: LessonContent;
  onStartTest: () => void;
  onFetchVideo: () => Promise<Blob>;
}

type VideoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

// Typical observed time for a 4-slide narrated video (TTS + encoding). Used
// only to drive an estimated progress bar — generation has no real progress
// events to report, so this caps below 100% and only reaches 100% on success.
const ESTIMATED_VIDEO_SECONDS = 60;

export default function LecturePlayer({ lesson, onStartTest, onFetchVideo }: LecturePlayerProps) {
  const { topic, grade, lecture_slides: slides } = lesson;
  const [index, setIndex] = useState(0);
  const [videoState, setVideoState] = useState<VideoState>({ status: "idle" });
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

  useEffect(() => {
    handleWatchVideo();
    // Runs once per lesson: App.tsx remounts this component (via `key`) for
    // every newly generated lesson, so this correctly re-fires each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const isFirst = index === 0;
  const progressPercent = ((index + 1) / slides.length) * 100;
  const videoProgressPercent = Math.min(96, (elapsedSeconds / ESTIMATED_VIDEO_SECONDS) * 100);

  async function handleWatchVideo() {
    const requestId = ++requestIdRef.current;
    setVideoState({ status: "loading" });
    try {
      const blob = await onFetchVideo();
      if (requestIdRef.current !== requestId) return;
      const url = URL.createObjectURL(blob);
      setVideoState({ status: "ready", url });
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setVideoState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to generate the video.",
      });
    }
  }

  function handleCancelWatch() {
    requestIdRef.current += 1;
    setVideoState({ status: "idle" });
  }

  // The video request can succeed (a valid file comes back) while the browser
  // still fails to actually play it — a bad codec, a blocked codec license, a
  // corrupted blob, etc. Without this, that failure is invisible: the <video>
  // tag just sits there blank/silent with no indication anything went wrong.
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
      message: `The video failed to play (${reason}). Try generating it again.`,
    });
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>
          Lecture — Slide {index + 1} of {slides.length}
        </span>
        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700">
          Grade {grade} · {topic}
        </span>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mb-4">
        {videoState.status === "idle" && (
          <button
            type="button"
            onClick={handleWatchVideo}
            className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 sm:w-auto"
          >
            🎬 Watch Video Lecture
          </button>
        )}
        {videoState.status === "loading" && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              <span>
                Generating your narrated video lecture... {elapsedSeconds}s elapsed (usually under a
                minute)
              </span>
            </div>
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-linear"
                style={{ width: `${videoProgressPercent}%` }}
              />
            </div>
            {elapsedSeconds > 60 && (
              <p className="mb-2 text-xs text-indigo-600">
                Still working — this is taking longer than usual (your device may be busy right
                now), but it hasn't failed. It will stop on its own after about 150 seconds if it
                can't finish.
              </p>
            )}
            <button
              type="button"
              onClick={handleCancelWatch}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Cancel
            </button>
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
                Watch the whole video to unlock the test — the Start Test button below will enable
                once it finishes.
              </p>
            )}
          </div>
        )}
      </div>

      <h3 className="mb-3 text-lg font-semibold text-slate-900">{slide.title}</h3>
      <p className="mb-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{slide.content}</p>

      <VisualAid visual={slide.visual} />

      {isLast && !hasWatchedVideo && (
        <p className="mt-4 text-xs font-medium text-amber-700">
          {videoState.status === "ready"
            ? "Finish watching the video above to unlock Start Test."
            : videoState.status === "error"
              ? "The video failed to generate — click \"Try again\" above, then watch it fully to unlock Start Test."
              : "Your narrated video lecture is being generated above — watch it fully once it's ready to unlock Start Test."}
        </p>
      )}

      <div className="mt-4 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => i - 1)}
          disabled={isFirst}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onStartTest}
            disabled={!hasWatchedVideo}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            Start Test
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
