import asyncio
import os
import re

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from google.auth.transport import requests as google_requests
from google.genai import errors as genai_errors
from google.oauth2 import id_token as google_id_token

import email_service
import gemini_service
from docx_export import build_lesson_docx
from gemini_service import GeminiNotConfigured, GeminiResponseError
from models import (
    DownloadRequest,
    ForgotPasswordRequest,
    GenerateRequest,
    GenerateResponse,
    GoogleAuthRequest,
    LoginRequest,
    QuestionVideoRequest,
    ReportRequest,
    ResetPasswordRequest,
    SendResultSmsRequest,
    SignupRequest,
    TopicIntroRequest,
    YouTubeExplanationRequest,
)
from password_policy import validate_password_strength
from pdf_export import build_lesson_pdf
from report_export import build_report_docx, build_report_pdf
from security import check_login, rate_limit, verify_login, video_rate_limit
import sms_service
from topic_intro_service import get_topic_intro_video, is_supported_topic
from tts_video import TTSUnavailableError, build_lecture_video, build_question_video
from user_store import (
    UserExistsError,
    create_password_reset_token,
    create_user,
    reset_password_with_token,
    upsert_google_user,
)
import youtube_service

app = FastAPI(title="Mathematics Assistant for Students API")

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip() or origins[0].strip()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


def _safe_filename_part(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_") or "Topic"


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/login", dependencies=[Depends(rate_limit)])
async def login(request: LoginRequest) -> dict:
    if not check_login(request.username, request.password):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    return {"success": True}


@app.get("/auth/google/config")
async def google_auth_config() -> dict:
    return {"configured": bool(GOOGLE_CLIENT_ID), "client_id": GOOGLE_CLIENT_ID}


@app.post("/auth/google", dependencies=[Depends(rate_limit)])
async def auth_google(request: GoogleAuthRequest) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google sign-in is not configured on this server.")

    try:
        payload = await asyncio.to_thread(
            google_id_token.verify_oauth2_token,
            request.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google sign-in token: {exc}")

    if not payload.get("email_verified", False):
        raise HTTPException(status_code=401, detail="This Google account's email is not verified.")

    email = payload.get("email", "")
    if not email:
        raise HTTPException(status_code=401, detail="Google did not provide an email address.")

    username, password = upsert_google_user(email)
    return {"username": username, "password": password}


@app.post("/signup", dependencies=[Depends(rate_limit)])
async def signup(request: SignupRequest) -> dict:
    username = request.username.strip()
    email = request.email.strip()
    password = request.password

    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    password_error = validate_password_strength(password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)

    try:
        create_user(username, email, password)
    except UserExistsError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"success": True}


@app.post("/forgot-password", dependencies=[Depends(rate_limit)])
async def forgot_password(request: ForgotPasswordRequest) -> dict:
    if not email_service.is_configured():
        raise HTTPException(status_code=503, detail="Password reset email is not configured on this server.")

    token = create_password_reset_token(request.username, request.email)
    if not token:
        raise HTTPException(
            status_code=400,
            detail="No account found with that username and email combination.",
        )

    reset_link = f"{FRONTEND_URL}?reset_token={token}"
    try:
        await asyncio.to_thread(
            email_service.send_password_reset_email, request.email, request.username, reset_link
        )
    except email_service.EmailSendError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"success": True}


@app.post("/reset-password", dependencies=[Depends(rate_limit)])
async def reset_password_endpoint(request: ResetPasswordRequest) -> dict:
    password_error = validate_password_strength(request.new_password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)

    if not reset_password_with_token(request.token, request.new_password):
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Please request a new one.",
        )

    return {"success": True}


@app.post("/generate", response_model=GenerateResponse, dependencies=[Depends(verify_login), Depends(rate_limit)])
async def generate(request: GenerateRequest) -> GenerateResponse:
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Please enter a topic.")

    try:
        lesson = await gemini_service.generate_lesson(
            topic, request.grade, request.num_questions, request.subject
        )
    except GeminiNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except GeminiResponseError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini returned an unreadable response after retrying. Please try again. ({exc})",
        )
    except genai_errors.ClientError as exc:
        if exc.code == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini's free-tier rate limit was hit repeatedly and retries were "
                    "exhausted. Wait a minute and try again, or request fewer questions."
                ),
            )
        raise HTTPException(status_code=400, detail=f"Gemini API rejected the request: {exc}")
    except genai_errors.ServerError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini API server error: {exc}")
    except genai_errors.APIError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc}")

    return GenerateResponse(lesson=lesson)


@app.post("/download/docx", dependencies=[Depends(verify_login)])
async def download_docx(request: DownloadRequest) -> StreamingResponse:
    buffer = build_lesson_docx(request.lesson)
    filename = f"Math_Assistant_{_safe_filename_part(request.lesson.topic)}_Grade{request.lesson.grade}.docx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/download/pdf", dependencies=[Depends(verify_login)])
async def download_pdf(request: DownloadRequest) -> StreamingResponse:
    buffer = build_lesson_pdf(request.lesson)
    filename = f"Math_Assistant_{_safe_filename_part(request.lesson.topic)}_Grade{request.lesson.grade}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/download/report/docx", dependencies=[Depends(verify_login)])
async def download_report_docx(request: ReportRequest) -> StreamingResponse:
    buffer = build_report_docx(request.topic, request.grade, request.result)
    filename = f"Math_Assistant_{_safe_filename_part(request.topic)}_Report.docx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/download/report/pdf", dependencies=[Depends(verify_login)])
async def download_report_pdf(request: ReportRequest) -> StreamingResponse:
    buffer = build_report_pdf(request.topic, request.grade, request.result)
    filename = f"Math_Assistant_{_safe_filename_part(request.topic)}_Report.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


LECTURE_VIDEO_TIMEOUT_SECONDS = 150
QUESTION_VIDEO_TIMEOUT_SECONDS = 80
VIDEO_TIMEOUT_DETAIL = (
    "Video generation took too long and was cancelled. This is usually caused by a slow internet "
    "connection to the narration service, or the server's CPU being busy with other programs — "
    "please try again, and closing other heavy applications on the server machine can help."
)

# Each video build runs ffmpeg encoding + concurrent TTS calls, which is CPU/network heavy
# enough that running several at once makes ALL of them slower — measured concurrent builds
# that individually take ~20s each ballooning past the 100s timeout when 3 ran together, since
# explanation videos now generate automatically per question (see QuizPlayer.tsx) and can
# overlap with each other or a lecture video. Capping concurrency queues extra requests instead
# of letting them all starve each other into timing out.
_VIDEO_CONCURRENCY_LIMIT = 2
_video_semaphore = asyncio.Semaphore(_VIDEO_CONCURRENCY_LIMIT)


async def _generate_video(build_fn, args: tuple, timeout_seconds: float) -> bytes:
    # Queueing for a free slot isn't itself time-limited — only the actual generation is, once
    # it starts — so a burst of requests waits its turn rather than failing outright.
    async with _video_semaphore:
        return await asyncio.wait_for(asyncio.to_thread(build_fn, *args), timeout=timeout_seconds)


@app.post("/lecture-video", dependencies=[Depends(verify_login), Depends(video_rate_limit)])
async def lecture_video(request: DownloadRequest) -> Response:
    try:
        video_bytes = await _generate_video(
            build_lecture_video, (request.lesson,), LECTURE_VIDEO_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail=VIDEO_TIMEOUT_DETAIL)
    except TTSUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    filename = f"Math_Assistant_{_safe_filename_part(request.lesson.topic)}_Lecture.mp4"

    return Response(
        content=video_bytes,
        media_type="video/mp4",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@app.post("/question-video", dependencies=[Depends(verify_login), Depends(video_rate_limit)])
async def question_video(request: QuestionVideoRequest) -> Response:
    try:
        video_bytes = await _generate_video(
            build_question_video, (request.mcq, request.grade), QUESTION_VIDEO_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail=VIDEO_TIMEOUT_DETAIL)
    except TTSUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    filename = f"Math_Assistant_Q{request.mcq.question_number}_Explanation.mp4"

    return Response(
        content=video_bytes,
        media_type="video/mp4",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@app.post("/topic-intro-video", dependencies=[Depends(verify_login), Depends(video_rate_limit)])
async def topic_intro_video(request: TopicIntroRequest) -> Response:
    if not is_supported_topic(request.topic):
        raise HTTPException(status_code=404, detail="No introduction video is available for this topic.")
    try:
        # Cached after the first build (see topic_intro_service) — this is
        # fixed, hand-written content reused for every student, not
        # regenerated per request, so most calls just read from disk.
        video_bytes = await _generate_video(
            get_topic_intro_video, (request.topic,), QUESTION_VIDEO_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail=VIDEO_TIMEOUT_DETAIL)
    except TTSUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    filename = f"Math_Assistant_{_safe_filename_part(request.topic)}_Intro.mp4"

    return Response(
        content=video_bytes,
        media_type="video/mp4",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@app.get("/youtube/config")
async def youtube_config() -> dict:
    # Mirrors GET /auth/google/config — the frontend uses this to decide
    # whether to show the "Watch on YouTube" option at all, rather than
    # rendering a button that would just fail on every click.
    return {"configured": youtube_service.is_configured()}


@app.post("/youtube-explanation", dependencies=[Depends(verify_login), Depends(rate_limit)])
async def youtube_explanation(request: YouTubeExplanationRequest) -> dict:
    if not youtube_service.is_configured():
        raise HTTPException(status_code=400, detail="YouTube search is not configured on this server.")
    try:
        video = await youtube_service.find_kid_friendly_video(request.topic, request.grade)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"YouTube search failed: {exc}")

    if video is None:
        return {"available": False}

    return {
        "available": True,
        "video_id": video["video_id"],
        "title": video["title"],
        "channel_title": video["channel_title"],
        "embed_url": f"https://www.youtube-nocookie.com/embed/{video['video_id']}",
    }


@app.get("/sms/config")
async def sms_config() -> dict:
    # Mirrors GET /youtube/config — lets the frontend hide the "Text Me My
    # Result" button entirely when Twilio isn't configured.
    return {"configured": sms_service.is_configured()}


@app.post("/send-result-sms", dependencies=[Depends(verify_login), Depends(rate_limit)])
async def send_result_sms(request: SendResultSmsRequest) -> dict:
    if not request.phone.strip():
        raise HTTPException(status_code=400, detail="Please add a phone number in your Profile first.")
    try:
        await sms_service.send_test_result_sms(
            request.phone, request.topic, request.grade, request.score, request.total
        )
    except sms_service.SmsNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except sms_service.SmsSendError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"success": True}
