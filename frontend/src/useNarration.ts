import { useCallback, useEffect, useRef, useState } from "react";

export interface NarrationSegment<S extends string> {
  section: S;
  text: string;
}

export type NarrationStatus = "idle" | "playing" | "paused" | "done";

export const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

// Voices installed on the device start speaking instantly. The online ones
// (Edge's "Natural" voices, Chrome's "Google ..." voices) sound smoother but
// fetch every sentence over the internet first, which adds a pause before
// and between sentences — so a local voice always wins, preferring Indian
// English, and an online voice is used only when there is no local one.
const LOCAL_PREFERENCE = [/india|heera|ravi|neerja|prabhat/i, /zira|aria|jenny|samantha|karen|moira|hazel|susan/i];
const ONLINE_PREFERENCE = [/natural.*india|india.*natural/i, /natural/i, /neural/i, /google (us|uk) english/i];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const local = english.filter((v) => v.localService);
  for (const pattern of LOCAL_PREFERENCE) {
    const match = local.find((v) => pattern.test(v.name) || pattern.test(v.lang));
    if (match) return match;
  }
  if (local.length > 0) return local.find((v) => v.default) ?? local[0];
  for (const pattern of ONLINE_PREFERENCE) {
    const match = english.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return english.find((v) => v.default) ?? english[0] ?? null;
}

// Turns maths symbols into words so every voice reads them the same way
// ("₹1,250" → "1250 rupees", "7 × 8" → "7 times 8", "___" → "blank").
export function speakable(text: string): string {
  return text
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/₹\s?(\d+)/g, "$1 rupees")
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/−/g, " minus ")
    .replace(/(\d)\s*-\s*(\d)/g, "$1 minus $2")
    .replace(/=/g, " equals ")
    .replace(/_{2,}/g, " blank ")
    .replace(/(\d)\s?sq cm/g, "$1 square centimetres")
    .replace(/(\d)\s?sq m/g, "$1 square metres")
    .replace(/(\d)\s?cm/g, "$1 centimetres")
    .replace(/(\d)\s?m/g, "$1 metres")
    .replace(/\s{2,}/g, " ");
}

// Speaks a list of short segments one after another, so the caller can
// show whichever scene is currently being read. Short utterances
// also sidestep Chrome's habit of silently stopping long ones mid-way, and
// pausing is done as cancel + restart-the-segment because the browsers'
// native speechSynthesis.pause()/resume() are unreliable.
export function useNarration<S extends string>(segments: NarrationSegment<S>[]) {
  const [status, setStatus] = useState<NarrationStatus>("idle");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const runIdRef = useRef(0);
  // Chrome can garbage-collect an utterance that nothing references before
  // its "end" event fires, which would stall the narration mid-way.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;
    const update = () => setVoice(pickVoice(synth.getVoices()));
    update();
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, []);

  const stopSpeaking = useCallback(() => {
    runIdRef.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => stopSpeaking, [stopSpeaking]);

  const speakFrom = useCallback(
    (start: number) => {
      if (!speechSupported) return;
      stopSpeaking();
      const runId = runIdRef.current;

      const speak = (index: number) => {
        const list = segmentsRef.current;
        if (runIdRef.current !== runId) return;
        if (index >= list.length) {
          setStatus("done");
          return;
        }
        setSegmentIndex(index);
        const utterance = new SpeechSynthesisUtterance(speakable(list[index].text));
        // Voices load asynchronously in Chrome, so the first line can be
        // spoken before "voiceschanged" has fired — look again right now.
        const chosen = voiceRef.current ?? pickVoice(window.speechSynthesis.getVoices());
        if (chosen) utterance.voice = chosen;
        utterance.lang = chosen?.lang ?? "en-US";
        utterance.rate = 0.92;
        utterance.pitch = 1.05;
        utterance.onend = () => speak(index + 1);
        utterance.onerror = (event) => {
          if (event.error === "interrupted" || event.error === "canceled") return;
          // Blocked by the browser's autoplay rules — leave it for the
          // student to start with the Play button instead.
          if (event.error === "not-allowed") {
            setStatus("idle");
            return;
          }
          speak(index + 1);
        };
        utteranceRef.current = utterance;
        // Chrome can be left in a paused state (e.g. after the tab was in
        // the background), which silently queues speech forever.
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      };

      setStatus("playing");
      speak(start);
    },
    [stopSpeaking],
  );

  const play = useCallback(() => speakFrom(0), [speakFrom]);
  const resume = useCallback(() => speakFrom(segmentIndex), [speakFrom, segmentIndex]);
  const pause = useCallback(() => {
    stopSpeaking();
    setStatus("paused");
  }, [stopSpeaking]);

  return { status, segmentIndex, play, playFrom: speakFrom, pause, resume };
}
