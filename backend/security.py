import os
import time
from collections import defaultdict
from typing import Optional

from fastapi import Header, HTTPException, Request

from user_store import verify_user_login

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 6

# Question-explanation videos now generate automatically as each question is
# answered, rather than only on a manual click — a single test can run
# through many questions per minute, so this needs its own, more generous
# bucket instead of sharing the login/generate limit above (which would
# otherwise also block unrelated requests like starting a new lesson).
VIDEO_RATE_LIMIT_MAX_REQUESTS = 20

_request_log: dict = defaultdict(list)


def _expected_admin_credentials() -> tuple[str, str]:
    username = os.environ.get("ADMIN_USERNAME", "").strip()
    password = os.environ.get("ADMIN_PASSWORD", "").strip()
    return username, password


def check_login(identifier: str, password: str) -> bool:
    """Accepts either the single built-in admin login (from backend/.env) or
    a username/email registered via /signup (backend/user_store.py).
    """
    identifier = (identifier or "").strip()
    if not identifier or not password:
        return False

    expected_username, expected_password = _expected_admin_credentials()
    if expected_username and expected_password:
        if identifier == expected_username and password == expected_password:
            return True

    return verify_user_login(identifier, password)


def verify_login(
    x_app_username: Optional[str] = Header(default=None),
    x_app_password: Optional[str] = Header(default=None),
) -> None:
    """Gate protected routes behind the single admin login. Every request must
    carry the same username/password validated at /login.
    """
    if not check_login(x_app_username or "", x_app_password or ""):
        raise HTTPException(status_code=401, detail="Invalid or missing login credentials.")


def _enforce_rate_limit(request: Request, bucket: str, max_requests: int) -> None:
    ip = request.client.host if request.client else "unknown"
    key = f"{bucket}:{ip}"
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS

    recent = [t for t in _request_log[key] if t > window_start]
    if len(recent) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail="Too many requests from this IP. Please wait a minute and try again.",
        )

    recent.append(now)
    _request_log[key] = recent


def rate_limit(request: Request) -> None:
    """Simple in-memory per-IP rate limit as defense-in-depth against a
    leaked/shared login burning through the Gemini API quota or billing.
    """
    _enforce_rate_limit(request, "default", RATE_LIMIT_MAX_REQUESTS)


def video_rate_limit(request: Request) -> None:
    """Separate, more generous bucket for question-video generation, which
    now fires automatically per answered question instead of only on a
    manual click — see VIDEO_RATE_LIMIT_MAX_REQUESTS above.
    """
    _enforce_rate_limit(request, "video", VIDEO_RATE_LIMIT_MAX_REQUESTS)
