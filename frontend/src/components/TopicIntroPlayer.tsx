import { useEffect, useState } from "react";
import { getCachedIntroSlides, type IntroSlide } from "../api";
import { speechSupported, useNarration, type NarrationSegment } from "../useNarration";
import type { VisualAidData } from "../types";
import VisualAid from "./VisualAid";

interface TopicIntroPlayerProps {
  topic: string;
  onContinue: () => void;
  onBack: () => void;
  onFetchSlides: (topic: string) => Promise<IntroSlide[]>;
}

interface Segment extends NarrationSegment<string> {
  slide: number;
  sentence: number;
}

function splitSentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  return sentences.map((s) => s.trim()).filter(Boolean);
}

// One short utterance per sentence, so the current sentence can be
// highlighted and long slides never trip Chrome's cut-off on long speech.
function buildScript(slides: IntroSlide[]): Segment[] {
  return slides.flatMap((slide, slideIndex) => {
    const sentences = splitSentences(slide.content);
    return sentences.map((text, sentence) => ({
      section: String(slideIndex),
      slide: slideIndex,
      sentence,
      text: sentence === 0 && slideIndex > 0 ? `${slide.title}. ${text}` : text,
    }));
  });
}

// Pictures for slides without a diagram (the science topics).
const TOPIC_ART: Record<string, string[][]> = {
  Addition: [["🍎", "➕", "🍎"], ["✏️", "✏️", "➕", "✏️"], ["🔟", "➕", "🔢"]],
  Subtraction: [["🎈", "➖", "🎈"], ["🍪", "🍪", "➖", "🍪"], ["🔢", "➖", "🔟"]],
  Multiplication: [["🧺", "✖️", "🥭"], ["🔢", "✖️", "🔢"], ["📦", "✖️", "📦"]],
  Division: [["🍫", "➗", "🧒"], ["✏️", "➗", "🧒🧒"], ["🍬", "➗", "🧒"]],
  "Multiplication Tables": [["🔢", "📋"], ["4️⃣", "✖️", "🔢"], ["7️⃣", "✖️", "8️⃣"]],
  "Area and Perimeter": [["📐", "⬛"], ["📏", "🔲"], ["🟨", "📐"]],
  Plants: [["🌱", "☀️", "💧"], ["🌳"], ["🌿", "🌼"]],
  Animals: [["🐘", "🐅", "🐄"], ["🐄", "🐇", "🌾"], ["🦁", "🐅", "🍖"]],
  "Human Body": [["🧍", "❤️", "🧠"], ["❤️", "🫁"], ["🧠", "💭"]],
  "Our Earth, Water, and Air": [["🌍"], ["⛰️", "🌾"], ["🌊", "💧"], ["🌬️", "☁️"]],
  "Food and Health": [["🍎", "🥦", "🍚"], ["🥕", "🍌", "🥚"], ["🧼", "🏃", "😴"]],
  "Matter and Force": [["🧊", "💧", "♨️"], ["🧊", "💧", "♨️"], ["👐", "📦"]],
};

const v = (type: string, param1: number, param2: number, param3 = 0, label = ""): VisualAidData => ({
  type,
  param1,
  param2,
  param3,
  label,
});

// Diagrams for the worked examples each maths intro slide talks about
// (see TOPIC_INTRO_CONTENT in backend/topic_intro_service.py).
const TOPIC_DIAGRAMS: Record<string, VisualAidData[]> = {
  Addition: [v("number_line", 3, 5, 0, "3 + 2 = 5"), v("number_line", 4, 7, 0, "4 + 3 = 7"), v("column", 27, 15, 1)],
  Subtraction: [v("number_line", 5, 3, 0, "5 − 2 = 3"), v("number_line", 9, 5, 0, "9 − 4 = 5"), v("column", 42, 15, 2)],
  Multiplication: [v("groups", 3, 4, 0, "3 groups of 4 = 12"), v("groups", 5, 3, 0, "5 baskets of 3 = 15"), v("column", 12, 4, 3)],
  Division: [v("groups", 3, 4, 0, "12 shared into 3 groups = 4 each"), v("groups", 4, 5, 0, "20 ÷ 4 = 5 each"), v("groups", 5, 3, 0, "17 ÷ 5 = 3 each, 2 left over")],
  "Multiplication Tables": [v("groups", 3, 4, 0, "4 × 3 = 12"), v("groups", 4, 4, 0, "4 × 4 = 16"), v("column", 7, 8, 3)],
  "Area and Perimeter": [v("rectangle", 5, 3, 0, "cm"), v("rectangle", 5, 3, 0, "cm"), v("rectangle", 5, 3, 1, "cm")],
};

function diagramFor(topic: string, slideIndex: number): VisualAidData | null {
  return TOPIC_DIAGRAMS[topic]?.[slideIndex] ?? null;
}

function artFor(topic: string, slideIndex: number): string[] {
  const art = TOPIC_ART[topic] ?? [["📘", "✨"]];
  return art[slideIndex % art.length];
}

// The topic introduction as a narrated slideshow, spoken by the browser's
// own voice — it starts the moment the slides arrive, with nothing to render
// or download first.
export default function TopicIntroPlayer({ topic, onContinue, onBack, onFetchSlides }: TopicIntroPlayerProps) {
  // Usually already loaded at login, so the intro starts on the very first render.
  const [slides, setSlides] = useState<IntroSlide[] | null>(() => getCachedIntroSlides(topic));
  const [error, setError] = useState("");
  const [hasWatched, setHasWatched] = useState(false);

  const script = slides ? buildScript(slides) : [];
  const narration = useNarration(script);
  const { status, segmentIndex } = narration;
  const isRunning = status === "playing" || status === "paused";

  async function loadSlides() {
    setError("");
    try {
      setSlides(await onFetchSlides(topic));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the introduction.");
    }
  }

  useEffect(() => {
    if (!slides) loadSlides();
    // Runs once per topic: App.tsx remounts this component (via `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start speaking as soon as the slides arrive. The student just clicked a
  // topic, so browsers allow it; if one still blocks it, the Play overlay
  // stays up for them to start it.
  useEffect(() => {
    if (slides && slides.length > 0) narration.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  useEffect(() => {
    if (status === "done") setHasWatched(true);
  }, [status]);

  const segment = isRunning ? script[segmentIndex] : null;
  const slideIndex = segment?.slide ?? (status === "done" && slides ? slides.length - 1 : 0);
  const slide = slides?.[slideIndex];

  function handleMainButton() {
    if (status === "playing") narration.pause();
    else if (status === "paused") narration.resume();
    else narration.play();
  }

  function jumpToSlide(target: number) {
    narration.playFrom(script.findIndex((s) => s.slide === target));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-indigo-100 backdrop-blur sm:p-6">
      <button type="button" onClick={onBack} className="mb-4 text-sm font-medium text-indigo-600 hover:underline">
        ← Back to topics
      </button>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Topic Introduction</p>
      <h2 className="mb-4 text-lg font-bold text-slate-900">What is {topic}?</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="mb-2">{error}</p>
          <button type="button" onClick={loadSlides} className="text-xs font-semibold text-red-700 hover:underline">
            Try again
          </button>
        </div>
      )}

      {!speechSupported && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          This browser can't speak the introduction aloud. Try the latest Chrome or Edge.
        </p>
      )}

      {slides && slide && (
        <div className="mb-4 overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
          <div className="relative flex min-h-[16rem] flex-col bg-orange-50 px-5 py-4 text-slate-800 sm:min-h-[20rem] sm:px-8 sm:py-6">
            <div key={slideIndex} className="scene-in flex flex-1 flex-col">
              <h3 className="mb-3 text-xl font-bold text-slate-900 sm:text-2xl">{slide.title}</h3>
              <p className="text-base leading-relaxed sm:text-lg">
                {splitSentences(slide.content).map((sentence, index) => (
                  <span
                    key={index}
                    className={
                      segment?.slide === slideIndex && segment.sentence === index
                        ? "rounded bg-amber-200/80 px-0.5 transition-colors"
                        : "transition-colors"
                    }
                  >
                    {sentence}{" "}
                  </span>
                ))}
              </p>
              {diagramFor(topic, slideIndex) ? (
                <div className="mx-auto mt-4 w-full max-w-md rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <VisualAid visual={diagramFor(topic, slideIndex)!} />
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap justify-center gap-3" aria-hidden="true">
                  {artFor(topic, slideIndex).map((emoji, index) => (
                    <span
                      key={index}
                      className="kid-float text-5xl sm:text-6xl"
                      style={{ animationDuration: `${2.2 + index * 0.4}s`, animationDelay: `${index * 0.2}s` }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!isRunning && speechSupported && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
                <button
                  type="button"
                  onClick={narration.play}
                  className="flex flex-col items-center gap-2 text-white focus:outline-none"
                  aria-label={status === "done" ? "Watch the introduction again" : "Play introduction"}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-indigo-600 shadow-lg transition hover:scale-105">
                    {status === "done" ? "↻" : "▶"}
                  </span>
                  <span className="text-base font-semibold drop-shadow">
                    {status === "done" ? "Watch again" : "Watch the introduction"}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-3 py-2">
            <button
              type="button"
              onClick={handleMainButton}
              disabled={!speechSupported}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm text-white transition hover:bg-indigo-700 disabled:opacity-50"
              aria-label={status === "playing" ? "Pause" : status === "done" ? "Replay" : "Play"}
            >
              {status === "playing" ? "⏸" : status === "done" ? "↻" : "▶"}
            </button>
            <div className="flex flex-1 gap-1">
              {slides.map((target, index) => {
                const filled = status === "done" || (isRunning && index < slideIndex);
                const current = isRunning && index === slideIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => jumpToSlide(index)}
                    title={`Jump to: ${target.title}`}
                    className="group flex-1 py-1.5"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition ${
                        filled
                          ? "bg-indigo-500"
                          : current
                            ? "animate-pulse bg-indigo-400"
                            : "bg-indigo-100 group-hover:bg-indigo-200"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!hasWatched && speechSupported && !error}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
