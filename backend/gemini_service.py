import asyncio
import json
import os
import re

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from models import LectureSlide, LessonContent, MCQItem, VisualAid
from prompt import LessonValidationError, build_user_prompt, get_system_prompt, validate_lesson_json

MODEL_ID = "gemini-3.1-flash-lite"
MAX_RETRIES = 3
DEFAULT_RETRY_SECONDS = 5.0
MAX_PARSE_RETRIES = 2
MAX_OUTPUT_TOKENS = 20000


class GeminiNotConfigured(Exception):
    pass


class GeminiResponseError(Exception):
    pass


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise GeminiNotConfigured(
            "GEMINI_API_KEY is not set. Add it to backend/.env and restart the backend."
        )
    return genai.Client(api_key=api_key)


def _retry_delay_seconds(exc: genai_errors.ClientError) -> float:
    try:
        for detail in exc.details.get("error", {}).get("details", []):
            if detail.get("@type", "").endswith("RetryInfo"):
                match = re.match(r"([\d.]+)", detail.get("retryDelay", ""))
                if match:
                    return float(match.group(1))
    except Exception:
        pass
    return DEFAULT_RETRY_SECONDS


async def _generate_with_retry(client: genai.Client, user_prompt: str, system_prompt: str):
    attempt = 0
    while True:
        try:
            return await client.aio.models.generate_content(
                model=MODEL_ID,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    temperature=0.4,
                    max_output_tokens=MAX_OUTPUT_TOKENS,
                ),
            )
        except genai_errors.ClientError as exc:
            if exc.code != 429 or attempt >= MAX_RETRIES:
                raise
            await asyncio.sleep(_retry_delay_seconds(exc) + 1)
            attempt += 1


async def generate_lesson(topic: str, grade: int, num_questions: int, subject: str = "Mathematics") -> LessonContent:
    client = _get_client()
    user_prompt = build_user_prompt(topic, grade, num_questions)
    system_prompt = get_system_prompt(subject)

    last_error = None
    for _ in range(MAX_PARSE_RETRIES + 1):
        response = await _generate_with_retry(client, user_prompt, system_prompt)

        try:
            data = json.loads(response.text)
        except (json.JSONDecodeError, TypeError) as exc:
            finish_reason = None
            try:
                finish_reason = response.candidates[0].finish_reason
            except Exception:
                pass
            last_error = GeminiResponseError(
                f"Gemini returned a response that could not be parsed as JSON "
                f"(finish_reason={finish_reason}): {exc}. Raw text: {response.text!r}"
            )
            continue

        try:
            validate_lesson_json(data, expected_count=num_questions)
        except LessonValidationError as exc:
            last_error = GeminiResponseError(f"Gemini's response failed validation: {exc}")
            continue

        return LessonContent(
            topic=topic,
            grade=grade,
            concept_explanation=data["concept_explanation"].strip(),
            lecture_slides=[
                LectureSlide(
                    title=str(slide["title"]).strip(),
                    content=str(slide["content"]).strip(),
                    visual=_parse_visual(slide["visual"]),
                )
                for slide in data["lecture_slides"]
            ],
            mcqs=[
                MCQItem(
                    topic=str(mcq["topic"]).strip(),
                    question_number=int(mcq["question_number"]),
                    question=str(mcq["question"]).strip(),
                    option_a=str(mcq["option_a"]).strip(),
                    option_b=str(mcq["option_b"]).strip(),
                    option_c=str(mcq["option_c"]).strip(),
                    option_d=str(mcq["option_d"]).strip(),
                    correct_answer=str(mcq["correct_answer"]).strip().upper(),
                    explanation=str(mcq["explanation"]).strip(),
                    trick=str(mcq["trick"]).strip(),
                    visual=_parse_visual(mcq["visual"]),
                )
                for mcq in data["mcqs"]
            ],
        )

    raise last_error


def _parse_visual(raw: dict) -> VisualAid:
    def _as_int(value) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    return VisualAid(
        type=str(raw.get("type", "none")).strip() or "none",
        param1=_as_int(raw.get("param1", 0)),
        param2=_as_int(raw.get("param2", 0)),
        param3=_as_int(raw.get("param3", 0)),
        label=str(raw.get("label", "")).strip(),
    )
