import { useEffect, useRef, useState } from "react";
import { getYouTubeConfig, type YouTubeExplanation } from "../api";
import type { MCQItem } from "../types";
import ExplanationVideo from "./ExplanationVideo";

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
  onFetchYouTubeExplanation: (topic: string) => Promise<YouTubeExplanation>;
}

type YouTubeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; embedUrl: string; title: string; channelTitle: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
export default function QuizPlayer({
  mcqs,
  onFinish,
  onFetchYouTubeExplanation,
}: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [viewSelection, setViewSelection] = useState<string | null>(null);
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);
  const [youtubeStates, setYoutubeStates] = useState<Record<number, YouTubeState>>({});
  // Set only when a question is answered right now (not when revisiting an
  // already-answered one), so the explanation video auto-plays once, straight
  // after the student's click — which also satisfies browsers' autoplay rules.
  const [justAnswered, setJustAnswered] = useState(false);
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
  const currentYoutubeState: YouTubeState = youtubeStates[currentIndex] ?? { status: "idle" };

  const options: Record<(typeof OPTION_LETTERS)[number], string> = {
    A: current.option_a,
    B: current.option_b,
    C: current.option_c,
    D: current.option_d,
  };

  function goTo(index: number) {
    setJustAnswered(false);
    setCurrentIndex(index);
    setViewSelection(answers[index] ?? null);
  }

  function selectOption(letter: string) {
    if (viewSelection !== null) return;
    setViewSelection(letter);
    setAnswers((prev) => ({ ...prev, [currentIndex]: letter }));
    setJustAnswered(true);
  }

  // Manual (not auto-triggered) — a YouTube search costs real API quota, so
  // this only runs when a student actually asks for it, unlike the
  // explanation video above which is free and starts on its own.
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
        <div className="mb-4">
          <ExplanationVideo
            key={currentIndex}
            mcq={current}
            yourAnswer={viewSelection}
            autoPlay={justAnswered}
          />

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
