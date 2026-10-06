import { Fragment, useEffect, useRef, useState } from "react";
import { loadConceptLibrary } from "../conceptLibrary";
import { estimateSeconds, getConceptVideos, type ConceptVideo } from "../conceptVideos";
import { GRADES, getGradeTopicModules, subjectForTopic, type TopicModule } from "../subjectModules";
import type { WatchedVideos } from "../videoProgress";
import ConceptVideoPlayer from "./ConceptVideoPlayer";
import type { Subject } from "./SubjectSelect";

interface VideoLibraryPageProps {
  // Open on this topic (and grade), e.g. from a "Videos" button.
  initialTopic?: string;
  initialGrade?: number;
  watched: WatchedVideos;
  onWatched: (videoId: string) => void;
  onBack: () => void;
}

const SUBJECTS: Array<{ subject: Subject; label: string; icon: string }> = [
  { subject: "Mathematics", label: "Maths", icon: "🧮" },
  { subject: "Science", label: "Science", icon: "🔬" },
];

const ICON_TINTS = ["bg-amber-100", "bg-sky-100", "bg-emerald-100", "bg-pink-100", "bg-violet-100", "bg-orange-100", "bg-teal-100", "bg-rose-100"];

const minutes = (video: ConceptVideo) => Math.max(1, Math.round(estimateSeconds(video) / 30) / 2);

// The grade a topic is taught in, when opened from elsewhere without one.
function gradeForTopic(subject: Subject, topic: string): number | undefined {
  return GRADES.find((g) => getGradeTopicModules(subject, g).some((m) => m.topic === topic));
}

// Every syllabus concept, by subject and grade, each with its animated
// concept video (plus the hand-made videos for the main topics).
export default function VideoLibraryPage({ initialTopic, initialGrade, watched, onWatched, onBack }: VideoLibraryPageProps) {
  const startSubject = initialTopic ? subjectForTopic(initialTopic) : "Mathematics";
  const [subject, setSubject] = useState<Subject>(startSubject);
  const [grade, setGrade] = useState(() => initialGrade ?? (initialTopic ? gradeForTopic(startSubject, initialTopic) : undefined) ?? 1);
  const [library, setLibrary] = useState<Record<string, ConceptVideo> | null>(null);
  const [selected, setSelected] = useState<TopicModule | null>(null);
  const [playing, setPlaying] = useState<ConceptVideo | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const modules = getGradeTopicModules(subject, grade);

  useEffect(() => {
    let cancelled = false;
    setLibrary(null);
    loadConceptLibrary(subject, grade).then((loaded) => {
      if (!cancelled) setLibrary(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [subject, grade]);

  // Opened for a particular topic: select it and start its video once loaded.
  useEffect(() => {
    if (!initialTopic || !library || selected) return;
    const module = modules.find((m) => m.topic === initialTopic);
    if (module) choose(module);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library]);

  function videosFor(module: TopicModule): ConceptVideo[] {
    const fromLibrary = library?.[module.topic];
    return [...(fromLibrary ? [fromLibrary] : []), ...getConceptVideos(module.topic)];
  }

  function choose(module: TopicModule) {
    setSelected(module);
    setPlaying(videosFor(module)[0] ?? null);
    requestAnimationFrame(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function switchTo(nextSubject: Subject, nextGrade: number) {
    setSubject(nextSubject);
    setGrade(nextGrade);
    setSelected(null);
    setPlaying(null);
  }

  const gradeVideos = library ? modules.map((m) => library[m.topic]).filter(Boolean) : [];
  const watchedCount = gradeVideos.filter((v) => watched[v.id]).length;
  const tabClass = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
      active ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/50" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">🎬 Concept Videos</h1>
          <p className="text-sm text-slate-600">Short animated videos that explain every topic in your syllabus. Watch any time!</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          🏠 <span className="hidden sm:inline">Back to </span>Home
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex gap-1 self-start rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {SUBJECTS.map((item) => (
            <button key={item.subject} type="button" aria-pressed={subject === item.subject} onClick={() => switchTo(item.subject, grade)} className={tabClass(subject === item.subject)}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
        <div className="flex w-full gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:w-auto" role="tablist" aria-label="Grade">
          {GRADES.map((g) => (
            <button key={g} type="button" role="tab" aria-selected={g === grade} aria-label={`Grade ${g}`} onClick={() => switchTo(subject, g)} className={`flex-1 sm:flex-none ${tabClass(g === grade)}`}>
              <span className="hidden sm:inline">Grade </span>
              <span className="sm:hidden">Gr </span>
              {g}
            </button>
          ))}
        </div>
      </div>

      {library && gradeVideos.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-white">
          <span className="text-sm font-bold text-slate-700">
            Grade {grade} {subject === "Science" ? "Science" : "Maths"}: {watchedCount} of {gradeVideos.length} videos watched
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${(watchedCount / gradeVideos.length) * 100}%` }} />
          </div>
        </div>
      )}

      <div ref={playerRef} className="scroll-mt-24">
        {selected && (
          <div className="space-y-3 rounded-3xl bg-white p-4 shadow-lg ring-1 ring-slate-200/70 sm:p-5">
            <p className="font-display text-lg font-semibold text-slate-900">
              {selected.icon} {selected.label} <span className="text-sm font-sans font-bold text-slate-400">· Grade {grade}</span>
            </p>
            {playing ? (
              <ConceptVideoPlayer key={playing.id} video={playing} onWatched={onWatched} onClose={() => setPlaying(null)} />
            ) : (
              <p className="text-sm text-slate-500">Pick a video below to play it.</p>
            )}
            {videosFor(selected).length > 1 && (
              <div className="flex flex-wrap gap-2">
                {videosFor(selected).map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setPlaying(video)}
                    className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                      playing?.id === video.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    {video.icon} {video.title}
                    {watched[video.id] ? " ✓" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!library ? (
        <p className="rounded-2xl bg-white/80 px-4 py-6 text-center text-sm font-semibold text-slate-500">Loading videos…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modules.map((module, index) => {
            const videos = videosFor(module);
            const main = videos[0];
            const seen = videos.filter((v) => watched[v.id]).length;
            const active = selected?.topic === module.topic && selected.label === module.label;
            return (
              <Fragment key={`${module.group ?? ""}|${module.topic}|${module.label}`}>
                {module.group && module.group !== modules[index - 1]?.group && (
                  <h2 className="mt-3 flex items-center gap-2 px-1 text-lg font-semibold first:mt-0 sm:col-span-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
                    {module.group}
                  </h2>
                )}
                <button
                  type="button"
                  onClick={() => choose(module)}
                  disabled={!main}
                  className={`tile group flex w-full items-center gap-4 p-4 text-left disabled:cursor-not-allowed disabled:opacity-60 ${active ? "border-indigo-400 ring-2 ring-indigo-200" : ""}`}
                >
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl leading-none ${ICON_TINTS[index % ICON_TINTS.length]}`} aria-hidden="true">
                    {module.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold leading-snug text-slate-900">{module.label}</span>
                    <span className="block text-sm text-slate-500">{main ? main.title : "Video coming soon"}</span>
                    {main && (
                      <span className="mt-0.5 block text-xs font-bold text-slate-400">
                        {videos.length > 1 ? `${videos.length} videos` : `About ${minutes(main)} min`}
                        {seen > 0 && <span className="text-emerald-600"> · ✓ Watched{videos.length > 1 ? ` ${seen}/${videos.length}` : ""}</span>}
                      </span>
                    )}
                  </span>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-300/50 transition group-hover:scale-105"
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
