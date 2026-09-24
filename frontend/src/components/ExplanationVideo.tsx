import { useEffect } from "react";
import type { MCQItem } from "../types";
import { speechSupported, useNarration, type NarrationSegment } from "../useNarration";
import VisualAid from "./VisualAid";

// A titled slide per part of the explanation, each shown and read aloud
// before moving on. The question itself is already on screen above the
// video, so the video starts straight at understanding it.
type Slide = "understand" | "steps" | "answer" | "trick";

const SLIDES: Slide[] = ["understand", "steps", "answer", "trick"];

const SLIDE_TITLES: Record<Slide, string> = {
  understand: "🤔 Understanding the Question",
  steps: "🪜 How to Get the Answer",
  answer: "✅ The Answer",
  trick: "💡 Trick to Remember",
};

function optionTexts(mcq: MCQItem): Record<string, string> {
  return { A: mcq.option_a, B: mcq.option_b, C: mcq.option_c, D: mcq.option_d };
}

function questionExplanation(mcq: MCQItem): string {
  return mcq.question_explanation?.trim() || `Let's read the question carefully. It asks: ${mcq.question}`;
}

// Tests saved before solution_steps existed fall back to the explanation,
// one sentence per step.
function solutionSteps(mcq: MCQItem): string[] {
  if (mcq.solution_steps && mcq.solution_steps.length > 0) return mcq.solution_steps;
  const sentences = mcq.explanation.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [mcq.explanation];
  return sentences.map((s) => s.trim()).filter(Boolean);
}

interface Segment extends NarrationSegment<Slide> {
  // Which step on the "steps" slide is being read, for highlighting.
  step?: number;
}

function buildScript(mcq: MCQItem, yourAnswer: string): Segment[] {
  const options = optionTexts(mcq);
  const correct = mcq.correct_answer;
  const verdict =
    yourAnswer === correct ? "Well done, you got it right!" : `You chose ${yourAnswer}. Nice try!`;
  return [
    { section: "understand", text: questionExplanation(mcq) },
    ...solutionSteps(mcq).map((step, index) => ({
      section: "steps" as const,
      step: index,
      text: `${index === 0 ? "Let's solve it step by step. " : ""}Step ${index + 1}. ${step}`,
    })),
    {
      section: "answer",
      text: `So, the correct answer is ${correct}, ${options[correct] ?? ""}. ${mcq.explanation} ${verdict}`,
    },
    { section: "trick", text: `Here's a trick to remember: ${mcq.trick}` },
  ];
}

interface ExplanationVideoProps {
  mcq: MCQItem;
  yourAnswer: string;
  // Start playing on mount — only right after the student answers, since
  // browsers allow speech then (it follows their click).
  autoPlay: boolean;
}

// A narrated explanation video played entirely in the browser: what the
// question asks, the steps to the answer, the answer and a trick — each shown
// with its diagram and read aloud by the device's speech voice. Nothing is
// rendered on the server, so it starts instantly.
export default function ExplanationVideo({ mcq, yourAnswer, autoPlay }: ExplanationVideoProps) {
  const script = buildScript(mcq, yourAnswer);
  const narration = useNarration(script);
  const { status, segmentIndex } = narration;
  const options = optionTexts(mcq);
  const steps = solutionSteps(mcq);
  const isCorrect = yourAnswer === mcq.correct_answer;
  const isRunning = status === "playing" || status === "paused";
  const hasDiagram = mcq.visual.type !== "none";

  useEffect(() => {
    if (autoPlay) narration.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const segment = isRunning ? script[segmentIndex] : null;
  const slide: Slide = segment?.section ?? (status === "done" ? "answer" : "understand");
  const slideNumber = SLIDES.indexOf(slide) + 1;

  function handleMainButton() {
    if (status === "playing") narration.pause();
    else if (status === "paused") narration.resume();
    else narration.play();
  }

  function jumpToSlide(target: Slide) {
    narration.playFrom(script.findIndex((s) => s.section === target));
  }

  const diagram = hasDiagram && (
    <div className="mx-auto mt-3 w-full max-w-md rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <VisualAid visual={mcq.visual} />
    </div>
  );

  if (!speechSupported) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        This browser can't play the spoken explanation video. Try the latest Chrome or Edge.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
      <div className="relative flex min-h-[18rem] flex-col bg-orange-50 px-5 py-4 text-slate-800 sm:min-h-[22rem] sm:px-8 sm:py-6">
        <div key={slide} className="scene-in flex flex-1 flex-col">
          <h4 className="mb-3 text-xl font-bold text-slate-900 sm:text-2xl">{SLIDE_TITLES[slide]}</h4>

          {slide === "understand" && (
            <>
              <p className="text-base leading-relaxed sm:text-lg">{questionExplanation(mcq)}</p>
              {diagram}
            </>
          )}

          {slide === "steps" && (
            <>
              <ol className="space-y-2">
                {steps.map((step, index) => {
                  const current = segment?.step === index;
                  const reached = segment?.step !== undefined && index <= segment.step;
                  return (
                    <li
                      key={index}
                      className={`flex gap-3 rounded-lg px-3 py-2 text-sm leading-relaxed transition sm:text-base ${
                        current ? "bg-white shadow ring-2 ring-indigo-300" : reached ? "bg-white/70" : "opacity-40"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  );
                })}
              </ol>
              {diagram}
            </>
          )}

          {slide === "answer" && (
            <>
              <p className="mb-3 inline-block self-start rounded-lg border-2 border-emerald-400 bg-emerald-50 px-4 py-2 text-lg font-bold text-emerald-700 sm:text-xl">
                {mcq.correct_answer}) {options[mcq.correct_answer]}
              </p>
              <p className="mb-3 text-base leading-relaxed sm:text-lg">{mcq.explanation}</p>
              <p className="text-base font-semibold text-indigo-600">
                {isCorrect ? "🎉 Well done, you got it right!" : `💪 You chose ${yourAnswer} — nice try!`}
              </p>
              {diagram}
            </>
          )}

          {slide === "trick" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <span className="kid-twinkle text-6xl" style={{ animationDuration: "1.6s" }} aria-hidden="true">
                💡
              </span>
              <p className="rounded-xl bg-amber-100 px-5 py-4 text-center text-base font-semibold leading-relaxed text-amber-800 sm:text-lg">
                {mcq.trick}
              </p>
            </div>
          )}
        </div>

        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
            <button
              type="button"
              onClick={narration.play}
              className="flex flex-col items-center gap-2 text-white focus:outline-none"
              aria-label={status === "done" ? "Watch the explanation again" : "Play explanation video"}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-indigo-600 shadow-lg transition hover:scale-105">
                {status === "done" ? "↻" : "▶"}
              </span>
              <span className="text-base font-semibold drop-shadow">
                {status === "done" ? "Watch again" : "Watch the explanation"}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={handleMainButton}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm text-white transition hover:bg-indigo-700"
          aria-label={status === "playing" ? "Pause" : status === "done" ? "Replay" : "Play"}
        >
          {status === "playing" ? "⏸" : status === "done" ? "↻" : "▶"}
        </button>
        <div className="flex flex-1 gap-1">
          {SLIDES.map((target, index) => {
            const filled = status === "done" || (isRunning && index < slideNumber - 1);
            const current = isRunning && index === slideNumber - 1;
            return (
              <button
                key={target}
                type="button"
                onClick={() => jumpToSlide(target)}
                title={`Jump to: ${SLIDE_TITLES[target]}`}
                className="group flex-1 py-1.5"
              >
                <span
                  className={`block h-1.5 rounded-full transition ${
                    filled ? "bg-indigo-500" : current ? "animate-pulse bg-indigo-400" : "bg-indigo-100 group-hover:bg-indigo-200"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
