"""Builds the concept-video library shipped with the website.

For every Grades 1-5 topic it writes one animated concept video (the same
storyboard format the in-app player animates and narrates) into
frontend/public/concept-videos/<subject>-g<grade>.json, keyed by topic. The
website serves these as static files, so the Concept Videos page and the
"Watch first" card play them instantly with no AI call.

    node scripts/export-topics.mjs > topics.json
    python backend/build_concept_video_library.py topics.json

Re-running skips videos that already exist; delete an entry (or a file) to
regenerate it. Needs GEMINI_API_KEY in backend/.env.
"""

import asyncio
import json
import os
import re
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import concept_video_service  # noqa: E402  (needs the env loaded first)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "concept-videos")
CONCURRENCY = 4


# Must match the file names in frontend/src/subjects.ts.
SUBJECT_FILES = {"Mathematics": "maths", "Science": "science", "Social Studies": "social", "English": "english"}


def _file_for(subject: str, grade: int) -> str:
    return os.path.join(OUT_DIR, f"{SUBJECT_FILES[subject]}-g{grade}.json")


def _load(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


async def main(topics_path: str) -> None:
    with open(topics_path, "r", encoding="utf-8") as f:
        topics = json.load(f)
    os.makedirs(OUT_DIR, exist_ok=True)

    libraries: dict[str, dict] = {}
    for t in topics:
        path = _file_for(t["subject"], t["grade"])
        libraries.setdefault(path, _load(path))

    todo = [t for t in topics if t["topic"] not in libraries[_file_for(t["subject"], t["grade"])]]
    print(f"{len(topics)} topics, {len(todo)} to build")
    semaphore = asyncio.Semaphore(CONCURRENCY)
    write_lock = asyncio.Lock()
    failed = []

    async def build(t: dict) -> None:
        async with semaphore:
            # The label is the grade's own name for the concept, e.g.
            # "Addition with Carrying" for the shared "Addition" module.
            try:
                # Social Studies names carry their chapter ("Community Helpers:
                # Doctor"), which tells the AI the context.
                about = t["topic"] if t["subject"] in ("Social Studies", "English") else t["label"]
                video = await concept_video_service.get_concept_video(about, t["grade"], t["subject"])
            except Exception as exc:  # keep going; report at the end
                failed.append((t, exc))
                print(f"  FAILED  {t['subject']} G{t['grade']} {t['label']}: {exc}")
                return
        video = {
            **video,
            # Social Studies labels repeat across chapters ("Food"), so its ids use the full topic.
            "id": f"lib-{_slug(t['subject'])}-g{t['grade']}-{_slug(about)}",
            "topic": t["topic"],
        }
        path = _file_for(t["subject"], t["grade"])
        async with write_lock:
            libraries[path][t["topic"]] = video
            with open(path, "w", encoding="utf-8") as f:
                json.dump(libraries[path], f, ensure_ascii=False, indent=1)
        print(f"  ok      {t['subject']} G{t['grade']} {t['label']}: {video['title']}")

    await asyncio.gather(*(build(t) for t in todo))
    print(f"done; {len(failed)} failed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
