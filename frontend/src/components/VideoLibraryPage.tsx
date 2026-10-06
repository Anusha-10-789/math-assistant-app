import { useState } from "react";
import { estimateSeconds, getConceptVideos, type ConceptVideo } from "../conceptVideos";
import { getTopicModules, subjectForTopic } from "../subjectModules";
import type { WatchedVideos } from "../videoProgress";
import ConceptVideoPlayer from "./ConceptVideoPlayer";
import type { Subject } from "./SubjectSelect";

interface VideoLibraryPageProps {
  initialTopic?: string;
  watched: WatchedVideos;
  onWatched: (videoId: string) => void;
  onBack: () => void;
}

const SUBJECTS: Array<{ subject: Subject; label: string; icon: string }> = [
  { subject: "Mathematics", label: "Maths", icon: "🧮" },
  { subject: "Science", label: "Science", icon: "🔬" },
];

export default function VideoLibraryPage({ initialTopic, watched, onWatched, onBack }: VideoLibraryPageProps) {
  const [subject, setSubject] = useState<Subject>(() => (initialTopic ? subjectForTopic(initialTopic) : "Mathematics"));
  const [topic, setTopic] = useState(() => initialTopic ?? getTopicModules("Mathematics")[0].topic);
  const [playing, setPlaying] = useState<ConceptVideo | null>(null);

  const modules = getTopicModules(subject);
  const videos = getConceptVideos(topic);

  function chooseSubject(next: Subject) {
    setSubject(next);
    setTopic(getTopicModules(next)[0].topic);
    setPlaying(null);
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-5 shadow-lg sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Concept Videos</h2>
          <p className="text-sm text-slate-500">Short animated videos that explain each topic. Watch any time!</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          🏠 Back to Home
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {SUBJECTS.map((item) => (
          <button
            key={item.subject}
            type="button"
            onClick={() => chooseSubject(item.subject)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              subject === item.subject ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-indigo-50"
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {modules.map((module) => {
          const topicVideos = getConceptVideos(module.topic);
          const seen = topicVideos.filter((v) => watched[v.id]).length;
          const active = module.topic === topic;
          return (
            <button
              key={module.topic}
              type="button"
              onClick={() => {
                setTopic(module.topic);
                setPlaying(null);
              }}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                active ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200 bg-white hover:border-indigo-300"
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">
                {module.icon} {module.label}
              </span>
              <span className="block text-xs text-slate-500">
                {seen === topicVideos.length && seen > 0 ? "✅ " : ""}
                {seen} of {topicVideos.length} watched
              </span>
            </button>
          );
        })}
      </div>

      {playing && (
        <div className="mb-5">
          <ConceptVideoPlayer key={playing.id} video={playing} onWatched={onWatched} onClose={() => setPlaying(null)} />
        </div>
      )}

      <div className="space-y-2">
        {videos.map((video) => {
          const seen = watched[video.id];
          const isPlaying = playing?.id === video.id;
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => setPlaying(video)}
              className={`flex w-full items-center gap-4 rounded-xl border bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-sm ${
                isPlaying ? "border-indigo-400" : "border-slate-200"
              }`}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-3xl" aria-hidden="true">
                {video.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{video.title}</span>
                <span className="block text-xs text-slate-500">
                  {video.scenes.length} {video.scenes.length === 1 ? "part" : "parts"} · about {Math.max(1, Math.round(estimateSeconds(video) / 30) / 2)} min
                  {seen && ` · ✅ Watched${seen.timesWatched > 1 ? ` ${seen.timesWatched} times` : ""}`}
                </span>
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white" aria-hidden="true">
                {isPlaying ? "♪" : "▶"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
