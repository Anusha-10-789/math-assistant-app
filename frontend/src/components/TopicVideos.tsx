import { useEffect, useState } from "react";
import { fetchConceptVideo } from "../api";
import { getLibraryVideo } from "../conceptLibrary";
import { estimateSeconds, getConceptVideos, type ConceptVideo } from "../conceptVideos";
import type { WatchedVideos } from "../videoProgress";
import ConceptVideoPlayer from "./ConceptVideoPlayer";

interface TopicVideosProps {
  topic: string;
  grade: number;
  watched: WatchedVideos;
  onWatched: (videoId: string) => void;
}

type AiState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string };

const minutes = (video: ConceptVideo) => Math.max(1, Math.round(estimateSeconds(video) / 30) / 2);

// Short animated videos for a topic: the library video for this grade's
// concept plus any hand-made ones; for a typed-in topic outside the syllabus,
// one the AI storyboards on request.
export default function TopicVideos({ topic, grade, watched, onWatched }: TopicVideosProps) {
  const handMade = getConceptVideos(topic);
  const [playing, setPlaying] = useState<ConceptVideo | null>(null);
  const [aiVideo, setAiVideo] = useState<ConceptVideo | null>(null);
  const [ai, setAi] = useState<AiState>({ status: "idle" });
  const [libraryVideo, setLibraryVideo] = useState<ConceptVideo | null>(null);
  const [libraryChecked, setLibraryChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLibraryVideo(topic, grade).then((video) => {
      if (cancelled) return;
      setLibraryVideo(video);
      setLibraryChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [topic, grade]);

  const videos = [...(libraryVideo ? [libraryVideo] : []), ...handMade, ...(aiVideo ? [aiVideo] : [])];

  async function makeVideo() {
    setAi({ status: "loading" });
    try {
      const video = await fetchConceptVideo(topic, grade);
      setAiVideo(video);
      setAi({ status: "idle" });
      setPlaying(video);
    } catch (err) {
      setAi({ status: "error", message: err instanceof Error ? err.message : "Couldn't make the video. Please try again." });
    }
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-4 shadow-lg sm:p-5">
      <h3 className="mb-1 text-base font-bold text-slate-900">🎬 Watch first: a short animated video</h3>
      <p className="mb-3 text-sm text-slate-500">See the key ideas explained with pictures and a voice — then try the test.</p>

      {playing && (
        <div className="mb-3">
          <ConceptVideoPlayer key={playing.id} video={playing} onWatched={onWatched} onClose={() => setPlaying(null)} />
        </div>
      )}

      <div className="space-y-2">
        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setPlaying(video)}
            className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-indigo-300 ${
              playing?.id === video.id ? "border-indigo-400" : "border-slate-200"
            }`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl" aria-hidden="true">
              {video.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">{video.title}</span>
              <span className="block text-xs text-slate-500">
                About {minutes(video)} min{watched[video.id] ? " · ✅ Watched" : ""}
              </span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white" aria-hidden="true">
              ▶
            </span>
          </button>
        ))}

        {libraryChecked && videos.length === 0 && (
          <button
            type="button"
            onClick={makeVideo}
            disabled={ai.status === "loading"}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"
          >
            {ai.status === "loading" ? "✨ Making your video… this can take up to 30 seconds" : "▶ Watch a 1-minute video about this topic"}
          </button>
        )}
        {ai.status === "error" && <p className="text-sm text-rose-600">{ai.message}</p>}
      </div>
    </div>
  );
}
