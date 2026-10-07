"""AI-written animated concept videos for topics that have no hand-made one
(frontend/src/conceptVideos.ts covers the main modules only).

Gemini writes a short storyboard — scenes of narration sentences, each paired
with a frame of emoji and a caption — in the same "scene" format the
frontend's ConceptVideoPlayer already animates and narrates. A video is
generated once per topic and grade, then cached in kv_store for every student.
"""

import json
import re

import gemini_service
import kv_store

MOTIONS = {"grow", "float", "pulse", "rise", "fall", "push", "pull", "chain"}
CACHE_VERSION = 2
MAX_SCENES = 4
MAX_BEATS = 5
MAX_ITEMS = 6

SYSTEM_PROMPT = f"""You write short animated explainer videos for primary-school children (Grades 1-5).
Return ONLY JSON in this shape:
{{
  "title": "short catchy title, max 6 words",
  "icon": "one emoji for the topic",
  "scenes": [
    {{
      "title": "scene heading, max 6 words",
      "beats": [
        {{"say": "one short sentence the narrator speaks", "items": ["🌧️", "☁️"], "motion": "fall", "caption": "1-3 word label"}}
      ]
    }}
  ]
}}
Rules:
- Exactly 4 scenes; each scene has 3 to {MAX_BEATS} beats. The whole video is about 1 to 1.5 minutes when read aloud.
- Follow this teaching shape, pitched exactly at the given grade's syllabus:
  1. Hook: start from something the child sees in everyday life (at home, school, a market, a park) and ask a
     curious question that the video will answer.
  2. The idea: explain the concept in small steps, one idea per beat, with the correct key words.
  3. Example: work through one concrete example step by step (for maths, real numbers and the working; for
     science, a real thing or process the child knows; for social studies, a real place, person, festival,
     map or event in India the child can picture).
  4. Recap: sum up the key points in two or three beats, then end with a short "Think about it" question for the child.
- Use Indian names, places, food and money (rupees) where it helps. Facts about India (symbols, states,
  rivers, history, government) must be exactly right, and every community and religion treated with respect.
- "say": simple words a child of that grade understands, under 20 words, friendly and encouraging. No markdown.
- "items": 1 to {MAX_ITEMS} emoji that picture exactly what the sentence says. For maths you may use short tokens
  such as "3", "+", "=", "½", "10 cm" alongside emoji. Never put words in items — show a river as 🏞️, not "river".
- "motion": one of {", ".join(sorted(MOTIONS))} — pick the one that fits (fall for rain, rise for evaporation,
  grow for growth, push/pull for forces, chain for steps in order, pulse to highlight, float for calm scenes).
- "caption": 1 to 3 words naming the idea in that beat.
- Be factually correct and age-appropriate."""


class ConceptVideoError(Exception):
    pass


# A plain word ("square", "river") isn't a picture; the player shows items as
# big pictures, so only emoji and short maths tokens ("3", "+", "½") stay,
# along with measurements such as "10 cm".
def _picture_items(items) -> list[str]:
    kept = []
    for item in items or []:
        text = str(item).strip()
        if not text:
            continue
        if re.fullmatch(r"\d+([.,]\d+)?\s?[A-Za-z]{1,3}", text) or not re.search(r"[A-Za-z]{3,}", text):
            kept.append(text)
    return kept[:MAX_ITEMS]


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "topic"


def _clean(raw: dict, topic: str, grade: int) -> dict:
    """Validates Gemini's storyboard and converts it to the frontend's
    ConceptVideo shape; anything malformed is dropped rather than shown."""
    scenes = []
    for scene in (raw.get("scenes") or [])[:MAX_SCENES]:
        narration, frames = [], []
        for beat in (scene.get("beats") or [])[:MAX_BEATS]:
            say = str(beat.get("say", "")).strip()
            items = _picture_items(beat.get("items"))
            if not say or not items:
                continue
            motion = beat.get("motion") if beat.get("motion") in MOTIONS else "grow"
            caption = str(beat.get("caption", "")).strip()[:40]
            narration.append(say)
            frames.append({"items": items, "motion": motion, **({"caption": caption} if caption else {})})
        if narration:
            scenes.append(
                {
                    "title": str(scene.get("title", "")).strip()[:60] or topic,
                    "narration": narration,
                    "anim": {"kind": "scene", "frames": frames},
                }
            )
    if len(scenes) < 2:
        raise ConceptVideoError("The video storyboard came back incomplete.")
    return {
        "id": f"ai-{_slug(topic)}-g{grade}",
        "topic": topic,
        "title": str(raw.get("title", "")).strip()[:60] or topic,
        "icon": str(raw.get("icon", "")).strip()[:4] or "🎬",
        "scenes": scenes,
    }


async def get_concept_video(topic: str, grade: int) -> dict:
    cache_key = f"concept-video:v{CACHE_VERSION}:{topic.strip().lower()}:g{grade}"
    cached = kv_store.get(cache_key)
    if cached:
        return cached

    client = gemini_service._get_client()
    prompt = f"Topic: {topic}\nGrade: {grade}\nWrite the video storyboard JSON."
    last_error: Exception = ConceptVideoError("No response")
    for _ in range(gemini_service.MAX_PARSE_RETRIES + 1):
        response = await gemini_service._generate_with_retry(client, prompt, SYSTEM_PROMPT)
        try:
            video = _clean(json.loads(response.text or ""), topic, grade)
            break
        except (json.JSONDecodeError, AttributeError, TypeError, ConceptVideoError) as exc:
            last_error = exc
    else:
        raise ConceptVideoError(f"Couldn't build a video for this topic. Please try again. ({last_error})")

    kv_store.put(cache_key, video)
    return video
