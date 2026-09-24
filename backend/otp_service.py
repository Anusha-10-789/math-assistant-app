import asyncio
import os
import secrets
import threading
import time

import email_service
import sms_service
from password_hashing import hash_password, verify_password

# One-time codes for signing up, logging in and resetting a password, sent to
# an email address (SMTP) or a mobile number (Twilio SMS). Codes live only in
# memory — they last minutes, so losing them on a restart just means asking
# for a new one.

OTP_TTL_SECONDS = 10 * 60
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_SECONDS = 30

PURPOSE_TEXT = {
    "signup": "verify your new account",
    "login": "log in",
    "reset": "reset your password",
}

_codes: dict[str, dict] = {}
_lock = threading.Lock()


class OtpCooldown(Exception):
    pass


class OtpNotAvailable(Exception):
    pass


def dev_console_enabled() -> bool:
    """OTP_DEV_CONSOLE=true prints codes to the backend console instead of
    sending them — for trying the flows locally before SMTP/Twilio are set
    up. Never enable it on a public server."""
    return os.environ.get("OTP_DEV_CONSOLE", "").strip().lower() == "true"


def email_available() -> bool:
    return email_service.is_configured() or dev_console_enabled()


def sms_available() -> bool:
    return sms_service.is_configured() or dev_console_enabled()


def any_available() -> bool:
    return email_available() or sms_available()


def channel_for(destination: str) -> str:
    return "email" if "@" in destination else "sms"


def _destination_key(destination: str) -> str:
    if "@" in destination:
        return destination.strip().lower()
    digits = "".join(ch for ch in destination if ch.isdigit())
    return digits[-10:]


def mask(destination: str) -> str:
    if "@" in destination:
        local, _, domain = destination.partition("@")
        return f"{local[:2]}{'*' * max(1, len(local) - 2)}@{domain}"
    digits = "".join(ch for ch in destination if ch.isdigit())
    return f"{'*' * max(0, len(digits) - 4)}{digits[-4:]}"


def issue(purpose: str, destination: str) -> str:
    key = f"{purpose}:{_destination_key(destination)}"
    now = time.time()
    with _lock:
        existing = _codes.get(key)
        if existing and now - existing["issued_at"] < OTP_RESEND_SECONDS:
            wait = int(OTP_RESEND_SECONDS - (now - existing["issued_at"])) + 1
            raise OtpCooldown(f"Please wait {wait} seconds before asking for another code.")
        code = f"{secrets.randbelow(1_000_000):06d}"
        _codes[key] = {
            "hash": hash_password(code),
            "expires_at": now + OTP_TTL_SECONDS,
            "issued_at": now,
            "attempts": 0,
        }
        return code


def verify(purpose: str, destination: str, code: str) -> bool:
    """Checks and, on success, uses up the code. A few wrong tries burn it,
    since 6 digits are guessable with unlimited attempts."""
    key = f"{purpose}:{_destination_key(destination)}"
    with _lock:
        entry = _codes.get(key)
        if not entry:
            return False
        if time.time() > entry["expires_at"] or entry["attempts"] >= OTP_MAX_ATTEMPTS:
            _codes.pop(key, None)
            return False
        if not verify_password(code.strip(), entry["hash"]):
            entry["attempts"] += 1
            return False
        _codes.pop(key, None)
        return True


async def deliver(purpose: str, destination: str, code: str) -> None:
    action = PURPOSE_TEXT.get(purpose, "continue")
    channel = channel_for(destination)
    if dev_console_enabled() and not (
        email_service.is_configured() if channel == "email" else sms_service.is_configured()
    ):
        print(f"[OTP_DEV_CONSOLE] {purpose} code for {destination}: {code}", flush=True)
        return

    if channel == "email":
        if not email_service.is_configured():
            raise OtpNotAvailable("Email codes are not set up on this server.")
        await asyncio.to_thread(email_service.send_otp_email, destination, code, action)
    else:
        if not sms_service.is_configured():
            raise OtpNotAvailable("Mobile (SMS) codes are not set up on this server.")
        await sms_service.send_otp_sms(destination, code, action)
