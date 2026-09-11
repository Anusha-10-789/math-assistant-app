import { useEffect, useRef, useState } from "react";
import { getYouTubeConfig, type YouTubeExplanation } from "../api";
import type { MCQItem } from "../types";
import VisualAid from "./VisualAid";

export interface QuizResult {
  score: number;
  total: number;
  missed: Array<{
    questionNumber: number;
    topic: string;
    question: string;
    yourAnswer: string;
    correctAnswer: string;
    yourAnswerText: string;
    correctAnswerText: string;
    explanation: string;
  }>;
}

interface QuizPlayerProps {
  mcqs: MCQItem[];
  onFinish: (result: QuizResult) => void;
  onFetchQuestionVideo: (mcq: MCQItem) => Promise<Blob>;
  onFetchYouTubeExplanation: (topic: string) => Promise<YouTubeExplanation>;
}

type VideoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

type YouTubeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; embedUrl: string; title: string; channelTitle: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
const ESTIMATED_QUESTION_VIDEO_SECONDS = 20;

export default function QuizPlayer({
  mcqs,
  onFinish,
  onFetchQuestionVideo,
  onFetchYouTubeExplanation,
}: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [viewSelection, setViewSelection] = useState<string | null>(null);
  const [videoStates, setVideoStates] = useState<Record<number, VideoState>>({});
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);
  const [youtubeStates, setYoutubeStates] = useState<Record<number, YouTubeState>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdsRef = useRef<Record<number, number>>({});
  const youtubeRequestIdsRef = useRef<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    getYouTubeConfig().then(({ configured }) => {
      if (!cancelled) setYoutubeConfigured(configured);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = mcqs[currentIndex];
  const isLast = currentIndex === mcqs.length - 1;
  const isFirst = currentIndex === 0;
  const progressPercent = ((currentIndex + 1) / mcqs.length) * 100;
  // Explanation video generation starts automatically once an answer is
  // picked (see the effect below) — until that kicks in on the next render,
  // treat an unrequested video for an already-answered question as "loading"
  // rather than flashing an idle "Watch Video" button first.
  const currentVideoState: VideoState =
    videoStates[currentIndex] ?? (viewSelection !== null ? { status: "loading" } : { status: "idle" });
  const currentYoutubeState: YouTubeState = youtubeStates[currentIndex] ?? { status: "idle" };

  const options: Record<(typeof OPTION_LETTERS)[number], string> = {
    A: current.option_a,
    B: current.option_b,
    C: current.option_c,
    D: current.option_d,
  };

  useEffect(() => {
    if (currentVideoState.status !== "loading") {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoState.status, currentIndex]);

  useEffect(() => {
    if (viewSelection === null) return;
    if (videoStates[currentIndex]) return;
    handleWatchVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, viewSelection]);

  function goTo(index: number) {
    setCurrentIndex(index);
    setViewSelection(answers[index] ?? null);
  }

  function selectOption(letter: string) {
    if (viewSelection !== null) return;
    setViewSelection(letter);
    setAnswers((prev) => ({ ...prev, [currentIndex]: letter }));
  }

  async function handleWatchVideo() {
    const index = currentIndex;
    const mcq = current;
    const requestId = (requestIdsRef.current[index] ?? 0) + 1;
    requestIdsRef.current[index] = requestId;
    setVideoStates((prev) => ({ ...prev, [index]: { status: "loading" } }));
    try {
      const blob = await onFetchQuestionVideo(mcq);
      if (requestIdsRef.current[index] !== requestId) return;
      const url = URL.createObjectURL(blob);
      setVideoStates((prev) => ({ ...prev, [index]: { status: "ready", url } }));
    } catch (err) {
      if (requestIdsRef.current[index] !== requestId) return;
      setVideoStates((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: err instanceof Error ? err.message : "Failed to generate the video.",
        },
      }));
    }
  }

  function handleCancelWatch() {
    const index = currentIndex;
    requestIdsRef.current[index] = (requestIdsRef.current[index] ?? 0) + 1;
    setVideoStates((prev) => ({ ...prev, [index]: { status: "idle" } }));
  }

  // Manual (not auto-triggered) — a YouTube search costs real API quota, so
  // this only runs when a student actually asks for it, unlike the generated
  // explanation video above which is cheap enough to always auto-generate.
  async function handleWatchYouTube() {
    const index = currentIndex;
    const mcq = current;
    const requestId = (youtubeRequestIdsRef.current[index] ?? 0) + 1;
    youtubeRequestIdsRef.current[index] = requestId;
    setYoutubeStates((prev) => ({ ...prev, [index]: { status: "loading" } }));
    try {
      const result = await onFetchYouTubeExplanation(mcq.topic);
      if (youtubeRequestIdsRef.current[index] !== requestId) return;
      if (!result.available || !result.embedUrl) {
        setYoutubeStates((prev) => ({ ...prev, [index]: { status: "not_found" } }));
        return;
      }
      setYoutubeStates((prev) => ({
        ...prev,
        [index]: {
          status: "ready",
          embedUrl: result.embedUrl!,
          title: result.title ?? "",
          channelTitle: result.channelTitle ?? "",
        },
      }));
    } catch (err) {
      if (youtubeRequestIdsRef.current[index] !== requestId) return;
      setYoutubeStates((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: err instanceof Error ? err.message : "Failed to find a YouTube video.",
        },
      }));
    }
  }

  // The video request can succeed (a valid file comes back) while the browser
  // still fails to actually play it — a bad codec, a blocked codec license, a
  // corrupted blob, etc. Without this, that failure is invisible: the <video>
  // tag just sits there blank/silent with no indication anything went wrong.
  function handleVideoElementError(index: number, event: React.SyntheticEvent<HTMLVideoElement>) {
    const mediaError = event.currentTarget.error;
    const reasons: Record<number, string> = {
      1: "playback was aborted",
      2: "a network error interrupted loading",
      3: "the browser could not decode this video/audio",
      4: "this video format isn't supported by your browser",
    };
    const reason = mediaError ? reasons[mediaError.code] ?? "an unknown playback error occurred" : "an unknown playback error occurred";
    setVideoStates((prev) => ({
      ...prev,
      [index]: { status: "error", message: `The video failed to play (${reason}). Try generating it again.` },
    }));
  }

  function handleFinish() {
    let score = 0;
    const missed: QuizResult["missed"] = [];
    mcqs.forEach((mcq, index) => {
      const yourAnswer = answers[index] ?? "";
      if (yourAnswer === mcq.correct_answer) {
        score += 1;
      } else {
        const optionText: Record<string, string> = {
          A: mcq.option_a,
          B: mcq.option_b,
          C: mcq.option_c,
          D: mcq.option_d,
        };
        missed.push({
          questionNumber: mcq.question_number,
          topic: mcq.topic,
          question: mcq.question,
          yourAnswer,
          correctAnswer: mcq.correct_answer,
          yourAnswerText: optionText[yourAnswer] ?? "",
          correctAnswerText: optionText[mcq.correct_answer] ?? "",
          explanation: mcq.explanation,
        });
      }
    });
    onFinish({ score, total: mcqs.length, missed });
  }

  function optionClasses(letter: string): string {
    const base =
      "w-full rounded-lg border p-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-100";

    if (viewSelection === null) {
      return `${base} border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50`;
    }

    if (letter === current.correct_answer) {
      return `${base} cursor-not-allowed border-green-400 bg-green-50 text-green-800`;
    }

    if (letter === viewSelection) {
      return `${base} cursor-not-allowed border-red-400 bg-red-50 text-red-800`;
    }

    return `${base} cursor-not-allowed border-slate-200 bg-white text-slate-400`;
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Question {currentIndex + 1} of {mcqs.length}</span>
        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700">{current.topic}</span>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Q.{current.question_number}) {current.question}
      </h3>

      <div className="mb-4 space-y-2.5">
        {OPTION_LETTERS.map((letter) => (
          <button
            key={`${currentIndex}-${letter}`}
            type="button"
            onClick={() => selectOption(letter)}
            disabled={viewSelection !== null}
            className={optionClasses(letter)}
          >
            <span className="font-bold">{letter})</span> {options[letter]}
          </button>
        ))}
      </div>

      {viewSelection !== null && (
        <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-slate-700">
          <p className="mb-1 font-semibold text-indigo-700">Answer: {current.correct_answer}</p>
          <p className="mb-2 leading-relaxed">{current.explanation}</p>
          <p className="mb-3 text-amber-700">
            <span className="font-semibold">Trick:</span> {current.trick}
          </p>
          <VisualAid visual={current.visual} />

          <div className="mt-2">
            {currentVideoState.status === "idle" && (
              <button
                type="button"
                onClick={handleWatchVideo}
                className="w-full rounded-lg border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 sm:w-auto"
              >
                🎬 Generate Explanation Video
              </button>
            )}
            {currentVideoState.status === "loading" && (
              <div className="rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm text-indigo-700">
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                  <span>Generating explanation video... {elapsedSeconds}s elapsed</span>
                </div>
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(96, (elapsedSeconds / ESTIMATED_QUESTION_VIDEO_SECONDS) * 100)}%`,
                    }}
                  />
                </div>
                {elapsedSeconds > 20 && (
                  <p className="mb-2 text-xs text-indigo-600">
                    Still working — this is taking longer than usual, but it hasn't failed. It
                    will stop on its own after about 80 seconds if it can't finish.
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
            {currentVideoState.status === "error" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {currentVideoState.message}
              </div>
            )}
            {currentVideoState.status === "ready" && (
              <video
                controls
                src={currentVideoState.url}
                onError={(event) => handleVideoElementError(currentIndex, event)}
                className="w-full rounded-lg border border-slate-200"
              />
            )}
          </div>

          {youtubeConfigured && (
            <div className="mt-3">
              {currentYoutubeState.status === "idle" && (
                <button
                  type="button"
                  onClick={handleWatchYouTube}
                  className="w-full rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 sm:w-auto"
                >
                  ▶️ Watch on YouTube
                </button>
              )}
              {currentYoutubeState.status === "loading" && (
                <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-white px-4 py-3 text-sm text-red-700">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                  <span>Finding a kid-friendly video...</span>
                </div>
              )}
              {currentYoutubeState.status === "not_found" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  No suitable YouTube video was found for "{current.topic}".
                </div>
              )}
              {currentYoutubeState.status === "error" && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {currentYoutubeState.message}
                </div>
              )}
              {currentYoutubeState.status === "ready" && (
                <div>
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200">
                    <iframe
                      src={currentYoutubeState.embedUrl}
                      title={currentYoutubeState.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {currentYoutubeState.title} — {currentYoutubeState.channelTitle}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(currentIndex - 1)}
          disabled={isFirst}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={viewSelection === null}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Finish Test
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(currentIndex + 1)}
            disabled={viewSelection === null}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
