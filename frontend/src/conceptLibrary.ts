import type { Subject } from "./components/SubjectSelect";
import type { ConceptVideo } from "./conceptVideos";
import { subjectForTopic } from "./subjectModules";

// The concept-video library: one storyboarded, animated video for every
// Grades 1-5 syllabus topic, built ahead of time by
// backend/build_concept_video_library.py and shipped with the website as
// public/concept-videos/<subject>-g<grade>.json (keyed by topic). They play
// in ConceptVideoPlayer straight away, with no AI call.

type Library = Record<string, ConceptVideo>;

const loads = new Map<string, Promise<Library>>();

export function loadConceptLibrary(subject: Subject, grade: number): Promise<Library> {
  const file = `${subject === "Science" ? "science" : "maths"}-g${grade}.json`;
  let load = loads.get(file);
  if (!load) {
    load = fetch(`${import.meta.env.BASE_URL}concept-videos/${file}`)
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}));
    // A failed load (e.g. offline) is retried next time.
    load.then((library) => {
      if (Object.keys(library).length === 0) loads.delete(file);
    });
    loads.set(file, load);
  }
  return load;
}

export async function getLibraryVideo(topic: string, grade: number, subject: Subject = subjectForTopic(topic)): Promise<ConceptVideo | null> {
  const library = await loadConceptLibrary(subject, grade);
  return library[topic] ?? null;
}
