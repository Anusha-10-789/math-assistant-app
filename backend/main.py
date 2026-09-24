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
import otp_service
from docx_export import build_lesson_docx
from gemini_service import GeminiNotConfigured, GeminiResponseError
from models import (
    CodeResetRequest,
    OtpLoginRequest,
    OtpSendRequest,
    DownloadRequest,
    ForgotPasswordRequest,
    SecurityAnswerResetRequest,
    SecurityQuestionRequest,
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
from security import check_login, current_login, rate_limit, verify_login, video_rate_limit
import sms_service
from topic_intro_service import (
    TOPIC_INTRO_CONTENT,
    get_topic_intro_slides,
    get_topic_intro_video,
    is_supported_topic,
)
from tts_video import TTSUnavailableError, build_lecture_video, build_question_video
from user_store import (
    UserExistsError,
    create_password_reset_token,
    create_session_token,
    create_user,
    find_user,
    get_recovery_options,
    normalize_phone,
    reset_password_with_security_answer,
    reset_password_with_token,
    set_password,
    set_security_question,
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


OTP_WRONG_DETAIL = "That code is wrong or has expired. Check it, or ask for a new code."
NO_ACCOUNT_DETAIL = "No account found with that email address or mobile number."
ALREADY_REGISTERED_DETAIL = "That email or mobile number is already registered. Please log in instead."


def _is_email(value: str) -> bool:
    value = value.strip()
    return "@" in value and "." in value.split("@")[-1]


def _is_phone(value: str) -> bool:
    return "@" not in value and 10 <= len(normalize_phone(value).lstrip("+")) <= 15


def _otp_address(purpose: str, destination: str, channel: str = "") -> str:
    """Works out where a code goes. Signing up: the new email/mobile itself
    (which must not be registered yet). Logging in / resetting: the matching
    account's email or mobile - the one typed in, or the chosen `channel`."""
    destination = destination.strip()
    if purpose == "signup":
        if not (_is_email(destination) or _is_phone(destination)):
            raise HTTPException(status_code=400, detail="Please enter a valid email address or mobile number.")
        if find_user(destination):
            raise HTTPException(status_code=400, detail=ALREADY_REGISTERED_DETAIL)
        return destination if _is_email(destination) else normalize_phone(destination)

    user = find_user(destination)
    if not user:
        raise HTTPException(status_code=400, detail=NO_ACCOUNT_DETAIL)
    if not channel:
        channel = "sms" if _is_phone(destination) else "email"
    address = user.get("phone", "") if channel == "sms" else user.get("email", "")
    if not address:
        raise HTTPException(status_code=400, detail="This account has no mobile number saved. Use email instead.")
    return address


@app.get("/otp/config")
async def otp_config() -> dict:
    return {"email": otp_service.email_available(), "sms": otp_service.sms_available()}


@app.post("/otp/send", dependencies=[Depends(rate_limit)])
async def otp_send(request: OtpSendRequest) -> dict:
    if request.purpose not in otp_service.PURPOSE_TEXT:
        raise HTTPException(status_code=400, detail="Unknown code purpose.")
    address = _otp_address(request.purpose, request.destination, request.channel)
    channel = otp_service.channel_for(address)
    if not (otp_service.email_available() if channel == "email" else otp_service.sms_available()):
        raise HTTPException(
            status_code=503,
            detail="Codes by email are not set up on this server."
            if channel == "email"
            else "Codes by SMS are not set up on this server yet. Please use your email instead.",
        )
    try:
        code = otp_service.issue(request.purpose, address)
        await otp_service.deliver(request.purpose, address, code)
    except otp_service.OtpCooldown as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except otp_service.OtpNotAvailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except (email_service.EmailSendError, sms_service.SmsSendError) as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"success": True, "channel": channel, "sent_to": otp_service.mask(address)}


@app.post("/login/otp", dependencies=[Depends(rate_limit)])
async def login_with_otp(request: OtpLoginRequest) -> dict:
    address = _otp_address("login", request.identifier)
    if not otp_service.verify("login", address, request.code):
        raise HTTPException(status_code=401, detail=OTP_WRONG_DETAIL)
    token = create_session_token(request.identifier)
    if not token:
        raise HTTPException(status_code=400, detail=NO_ACCOUNT_DETAIL)
    # The token stands in for the password on every later request.
    return {"username": request.identifier.strip(), "password": token}


def _validate_security_question(question: str, answer: str) -> None:
    if not question.strip() or len(question.strip()) > 200:
        raise HTTPException(status_code=400, detail="Please choose a security question.")
    if len(answer.strip()) < 2:
        raise HTTPException(status_code=400, detail="Please enter an answer to your security question.")


@app.post("/signup", dependencies=[Depends(rate_limit)])
async def signup(request: SignupRequest) -> dict:
    email = request.email.strip()
    phone = normalize_phone(request.phone)
    password = request.password

    if not _is_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if not _is_phone(phone):
        raise HTTPException(status_code=400, detail="Please enter a valid mobile number (10-15 digits).")
    password_error = validate_password_strength(password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    _validate_security_question(request.security_question, request.security_answer)
    if find_user(email) or find_user(phone):
        raise HTTPException(status_code=400, detail=ALREADY_REGISTERED_DETAIL)

    # When the server can send codes, the new email or mobile must be proven
    # with one before the account is created.
    if otp_service.any_available():
        verified_address = phone if request.otp_channel == "sms" else email
        if not request.otp_code or not otp_service.verify("signup", verified_address, request.otp_code):
            raise HTTPException(status_code=400, detail=OTP_WRONG_DETAIL)

    try:
        username = create_user(
            email,
            phone,
            password,
            request.security_question,
            request.security_answer,
            request.username,
        )
    except UserExistsError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"success": True, "username": username}


@app.post("/forgot-password/options", dependencies=[Depends(rate_limit)])
async def forgot_password_options(request: ForgotPasswordRequest) -> dict:
    options = get_recovery_options(request.identifier)
    if not options:
        raise HTTPException(status_code=400, detail=NO_ACCOUNT_DETAIL)
    return {
        "security_question": options["security_question"],
        "email_available": bool(options["email"]) and otp_service.email_available(),
        "masked_email": otp_service.mask(options["email"]) if options["email"] else "",
        "sms_available": bool(options["phone"]) and otp_service.sms_available(),
        "masked_phone": otp_service.mask(options["phone"]) if options["phone"] else "",
    }


@app.post("/forgot-password/security-answer", dependencies=[Depends(rate_limit)])
async def forgot_password_security_answer(request: SecurityAnswerResetRequest) -> dict:
    password_error = validate_password_strength(request.new_password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    if not reset_password_with_security_answer(request.identifier, request.answer, request.new_password):
        raise HTTPException(status_code=400, detail="That answer doesn't match. Please try again.")
    return {"success": True}


@app.post("/forgot-password/verify-code", dependencies=[Depends(rate_limit)])
async def forgot_password_verify_code(request: CodeResetRequest) -> dict:
    password_error = validate_password_strength(request.new_password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    address = _otp_address("reset", request.identifier, request.channel)
    if not otp_service.verify("reset", address, request.code):
        raise HTTPException(status_code=400, detail=OTP_WRONG_DETAIL)
    set_password(request.identifier, request.new_password)
    return {"success": True}


@app.get("/account/security-question")
async def get_own_security_question(identifier: str = Depends(current_login)) -> dict:
    user = find_user(identifier)
    return {"security_question": (user or {}).get("security_question", ""), "is_account": bool(user)}


@app.post("/account/security-question", dependencies=[Depends(rate_limit)])
async def set_own_security_question(
    request: SecurityQuestionRequest, identifier: str = Depends(current_login)
) -> dict:
    _validate_security_question(request.question, request.answer)
    if not set_security_question(identifier, request.question, request.answer):
        raise HTTPException(
            status_code=400,
            detail="The built-in admin login has no account to save a security question on.",
        )
    return {"success": True}


@app.post("/forgot-password", dependencies=[Depends(rate_limit)])
async def forgot_password(request: ForgotPasswordRequest) -> dict:
    result = create_password_reset_token(request.identifier)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="No account found with that email address.",
        )
    token, user, channel = result

    reset_link = f"{FRONTEND_URL}?reset_token={token}"
    if channel == "sms":
        try:
            await sms_service.send_password_reset_sms(user["phone"], user["username"], reset_link)
        except sms_service.SmsNotConfigured:
            raise HTTPException(status_code=503, detail="Password reset by SMS is not configured on this server.")
        except sms_service.SmsSendError as exc:
            raise HTTPException(status_code=502, detail=str(exc))
    else:
        if not email_service.is_configured():
            raise HTTPException(status_code=503, detail="Password reset email is not configured on this server.")
        try:
            await asyncio.to_thread(
                email_service.send_password_reset_email, user["email"], user["username"], reset_link
            )
        except email_service.EmailSendError as exc:
            raise HTTPException(status_code=502, detail=str(exc))

    return {"success": True, "channel": channel}


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
            topic, request.grade, request.num_questions, request.subject, request.avoid_questions
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


@app.get("/topic-intro-slides/all", dependencies=[Depends(verify_login)])
async def all_topic_intro_slides() -> dict:
    # Fetched once right after login, so every topic's intro can start the
    # instant it's opened, with no request in between.
    return {"topics": {topic: get_topic_intro_slides(topic) for topic in TOPIC_INTRO_CONTENT}}


@app.post("/topic-intro-slides", dependencies=[Depends(verify_login)])
async def topic_intro_slides(request: TopicIntroRequest) -> dict:
    # Just the slide text — the frontend narrates it in the browser, so the
    # intro starts instantly instead of waiting for an mp4 to be encoded.
    if not is_supported_topic(request.topic):
        raise HTTPException(status_code=404, detail="No introduction is available for this topic.")
    return {"slides": get_topic_intro_slides(request.topic)}


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
