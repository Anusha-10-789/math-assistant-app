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
CACHE_VERSION = 1
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
- 3 or 4 scenes; each scene has 3 to {MAX_BEATS} beats. The whole video is about 1 minute when read aloud.
- Teach the key ideas of the topic in order, from the simplest idea to the main idea, and end with a one-line recap.
- "say": simple words a child of that grade understands, under 20 words, friendly and encouraging. No markdown.
- "items": 1 to {MAX_ITEMS} emoji that picture exactly what the sentence says. For maths you may use short tokens
  such as "3", "+", "=", "½", "10 cm" alongside emoji. Never put words in items — show a river as 🏞️, not "river".
- "motion": one of {", ".join(sorted(MOTIONS))} — pick the one that fits (fall for rain, rise for evaporation,
  grow for growth, push/pull for forces, chain for steps in order, pulse to highlight, float for calm scenes).
- "caption": 1 to 3 words naming the idea in that beat.
- Be factually correct and age-appropriate."""


class ConceptVideoError(Exception):
    pass


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
            items = [str(i).strip() for i in (beat.get("items") or []) if str(i).strip()][:MAX_ITEMS]
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
