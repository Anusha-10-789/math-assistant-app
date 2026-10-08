"""Turns the hand-written GK concept videos in part*.txt into the library files
frontend/public/concept-videos/gk-g<grade>.json (adding or replacing those topics).

Format:
    @ <grade>
    ## <topic>|<video title>|<icon>
    # <scene title>
    - <narration sentence> | <emoji or short tokens, space separated> | <motion> | <caption>

    python content/gk-videos/build.py
"""

import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "..", "frontend", "public", "concept-videos")
MOTIONS = {"grow", "float", "pulse", "rise", "fall", "push", "pull", "chain"}
# Flag emoji other than India's don't display on Windows.
STRAY_FLAG = re.compile("[\U0001F1E6-\U0001F1FF]")


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse(path: str) -> list[tuple[int, dict]]:
    videos, grade, video, scene = [], None, None, None
    for n, raw in enumerate(open(path, encoding="utf-8"), 1):
        line = raw.strip()
        where = f"{os.path.basename(path)}:{n}"
        if not line:
            continue
        if line.startswith("@"):
            grade = int(line[1:])
        elif line.startswith("## "):
            topic, title, icon = [p.strip() for p in line[3:].split("|")]
            video = {"id": f"lib-general-knowledge-g{grade}-{slug(topic)}", "topic": topic, "title": title, "icon": icon, "scenes": []}
            videos.append((grade, video))
        elif line.startswith("# "):
            scene = {"title": line[2:].strip(), "narration": [], "anim": {"kind": "scene", "frames": []}}
            video["scenes"].append(scene)
        elif line.startswith("- "):
            parts = [p.strip() for p in line[2:].split("|")]
            if len(parts) != 4:
                sys.exit(f"{where}: expected 4 parts separated by |")
            say, items, motion, caption = parts
            if motion not in MOTIONS:
                sys.exit(f"{where}: unknown motion {motion}")
            tokens = items.split()
            if not tokens or any(STRAY_FLAG.search(t.replace("🇮🇳", "")) for t in tokens):
                sys.exit(f"{where}: bad items {items!r}")
            scene["narration"].append(say)
            scene["anim"]["frames"].append({"items": tokens, "motion": motion, "caption": caption})
        else:
            sys.exit(f"{where}: can't read line")
    for grade, v in videos:
        if len(v["scenes"]) != 4 or any(not 3 <= len(s["narration"]) <= 5 for s in v["scenes"]):
            sys.exit(f"{v['topic']}: needs 4 scenes of 3 to 5 sentences")
    return videos


def main() -> None:
    by_grade: dict[int, list[dict]] = {}
    for path in sorted(glob.glob(os.path.join(HERE, "part*.txt"))):
        for grade, video in parse(path):
            by_grade.setdefault(grade, []).append(video)
    for grade, videos in sorted(by_grade.items()):
        out = os.path.join(OUT_DIR, f"gk-g{grade}.json")
        library = json.load(open(out, encoding="utf-8")) if os.path.exists(out) else {}
        for video in videos:
            library[video["topic"]] = video
        with open(out, "w", encoding="utf-8") as f:
            json.dump(library, f, ensure_ascii=False, indent=1)
        print(f"grade {grade}: wrote {len(videos)} videos, library now {len(library)}")


if __name__ == "__main__":
    main()
