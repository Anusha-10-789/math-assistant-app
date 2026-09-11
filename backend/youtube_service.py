import os
import time

import httpx

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# Well-known kids'/education channels whose content is a safe, curated first
# choice when they show up in results — safeSearch=strict below is the real
# safety net (applies regardless of channel), this just prefers familiar,
# trusted sources over an arbitrary top search hit when one is available.
PREFERRED_CHANNEL_TITLES = {
    "numberblocks",
    "khan academy kids",
    "khan academy",
    "math antics",
    "scishow kids",
    "free school",
    "peekaboo kidz",
    "math & learning videos 4 kids",
}

# search.list costs 100 quota units per call against a small free daily
# quota — caching by (topic, grade) means repeating the same lesson topic
# (the common case, since topics are mostly drawn from a fixed set of
# modules) doesn't re-spend quota. Process-lifetime cache is enough here;
# it doesn't need to survive a restart.
_CACHE_TTL_SECONDS = 24 * 60 * 60
_cache: dict[tuple[str, int], tuple[float, dict | None]] = {}


def _api_key() -> str:
    return os.environ.get("YOUTUBE_API_KEY", "").strip()


def is_configured() -> bool:
    return bool(_api_key())


async def find_kid_friendly_video(topic: str, grade: int) -> dict | None:
    """Searches YouTube for a kid-safe explanation video for a topic/grade.

    Returns {"video_id", "title", "channel_title"} or None if nothing
    suitable was found. Raises on a genuine API-level failure (bad key,
    network error) so the caller can surface that distinctly from "no
    results".
    """
    api_key = _api_key()
    if not api_key:
        return None

    cache_key = (topic.strip().lower(), grade)
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    params = {
        "key": api_key,
        "q": f"{topic} explained for kids grade {grade} math",
        "part": "snippet",
        "type": "video",
        "maxResults": 10,
        "safeSearch": "strict",
        "videoEmbeddable": "true",
        "relevanceLanguage": "en",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(YOUTUBE_SEARCH_URL, params=params)

    if response.status_code != 200:
        raise RuntimeError(f"YouTube search failed ({response.status_code}): {response.text[:300]}")

    items = response.json().get("items", [])
    result = _pick_best(items)
    _cache[cache_key] = (time.time(), result)
    return result


def _pick_best(items: list[dict]) -> dict | None:
    preferred = None
    for item in items:
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId")
        if not video_id:
            continue
        candidate = {
            "video_id": video_id,
            "title": snippet.get("title", ""),
            "channel_title": snippet.get("channelTitle", ""),
        }
        if preferred is None:
            preferred = candidate
        if candidate["channel_title"].strip().lower() in PREFERRED_CHANNEL_TITLES:
            return candidate
    return preferred
