import EmojiText from "./EmojiText";
import { useEffect, useState } from "react";
import type { ConceptVideo } from "../conceptVideos";
import { speechSupported, useNarration, type NarrationSegment } from "../useNarration";
import ConceptAnimation from "./ConceptAnimation";

interface ConceptVideoPlayerProps {
  video: ConceptVideo;
  onWatched: (videoId: string) => void;
  onClose: () => void;
}

interface Segment extends NarrationSegment<string> {
  scene: number;
  beat: number;
}

function buildScript(video: ConceptVideo): Segment[] {
  return video.scenes.flatMap((scene, sceneIndex) =>
    scene.narration.map((text, beat) => ({ section: String(sceneIndex), scene: sceneIndex, beat, text })),
  );
}

// A short animated concept video: each scene's animation moves on as each
// sentence is read aloud by the device's voice, with the sentence shown as
// a caption underneath. Without speech support the scenes are stepped
// through by hand instead.
export default function ConceptVideoPlayer({ video, onWatched, onClose }: ConceptVideoPlayerProps) {
  const script = buildScript(video);
  const narration = useNarration(script);
  const { status, segmentIndex } = narration;
  const isRunning = status === "playing" || status === "paused";
  const [manualScene, setManualScene] = useState(0);
  const lastScene = video.scenes.length - 1;

  // The student just clicked this video, so browsers allow speech to start.
  useEffect(() => {
    if (speechSupported) narration.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "done") onWatched(video.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!speechSupported && manualScene === lastScene) onWatched(video.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualScene]);

  const segment = isRunning ? script[segmentIndex] : null;
  const sceneIndex = speechSupported ? (segment?.scene ?? (status === "done" ? lastScene : 0)) : manualScene;
  // Before it starts, show the first step; once finished, the whole picture.
  const beat = speechSupported ? (segment?.beat ?? (status === "done" ? 99 : 0)) : 99;
  const scene = video.scenes[sceneIndex];
  const caption = segment?.text ?? (speechSupported ? "" : scene.narration.join(" "));

  function handleMainButton() {
    if (status === "playing") narration.pause();
    else if (status === "paused") narration.resume();
    else narration.play();
  }

  function jumpToScene(target: number) {
    if (!speechSupported) {
      setManualScene(target);
      return;
    }
    narration.playFrom(script.findIndex((s) => s.scene === target));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-indigo-100 px-4 py-2">
        <p className="text-sm font-bold text-slate-900">
          <EmojiText text={`${video.icon} ${video.title}`} />
        </p>
        <button type="button" onClick={onClose} className="text-sm font-medium text-indigo-600 hover:underline">
          Close
        </button>
      </div>

      <div className="relative flex min-h-[20rem] flex-col bg-orange-50 px-4 py-4 text-slate-800 sm:min-h-[22rem] sm:px-8 sm:py-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
          Part {sceneIndex + 1} of {video.scenes.length}
        </p>
        <h3 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">{scene.title}</h3>

        <div key={sceneIndex} className="scene-in flex flex-1 flex-col justify-center overflow-hidden">
          <ConceptAnimation anim={scene.anim} beat={beat} />
        </div>

        <p className="mt-4 min-h-[3rem] rounded-lg bg-slate-900/80 px-4 py-2 text-center text-base leading-snug text-white sm:text-lg" aria-live="polite">
          {caption}
        </p>

        {speechSupported && !isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
            <button
              type="button"
              onClick={narration.play}
              className="flex flex-col items-center gap-2 text-white focus:outline-none"
              aria-label={status === "done" ? "Watch the video again" : "Play video"}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-indigo-600 shadow-lg transition hover:scale-105">
                {status === "done" ? "↻" : "▶"}
              </span>
              <span className="text-base font-semibold drop-shadow">
                {status === "done" ? "🎉 Great watching! Watch again" : "Play video"}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 px-3 py-2">
        {speechSupported ? (
          <button
            type="button"
            onClick={handleMainButton}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm text-white transition hover:bg-indigo-700"
            aria-label={status === "playing" ? "Pause" : status === "done" ? "Replay" : "Play"}
          >
            {status === "playing" ? "⏸" : status === "done" ? "↻" : "▶"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setManualScene((s) => Math.min(lastScene, s + 1))}
            disabled={manualScene === lastScene}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
          >
            Next
          </button>
        )}
        <div className="flex flex-1 gap-1">
          {video.scenes.map((target, index) => {
            const done = speechSupported ? status === "done" || (isRunning && index < sceneIndex) : index < manualScene;
            const current = (speechSupported ? isRunning : true) && index === sceneIndex;
            return (
              <button key={index} type="button" onClick={() => jumpToScene(index)} title={`Jump to: ${target.title}`} className="group flex-1 py-1.5">
                <span
                  className={`block h-1.5 rounded-full transition ${
                    done ? "bg-indigo-500" : current ? "animate-pulse bg-indigo-400" : "bg-indigo-100 group-hover:bg-indigo-200"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
      {!speechSupported && (
        <p className="px-4 pb-3 text-xs text-amber-700">This browser can't read the video aloud, so read the captions and press Next. Chrome or Edge can speak it.</p>
      )}
    </div>
  );
}
