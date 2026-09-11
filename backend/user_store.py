import json
import os
import secrets
import threading
import time
from typing import Optional

from password_hashing import hash_password, verify_password

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

# Reset links are single-use and expire — long enough that a real email delay
# doesn't lock someone out, short enough that an old, unused link left in an
# inbox isn't a standing risk.
RESET_TOKEN_TTL_SECONDS = 60 * 60

_lock = threading.Lock()


class UserExistsError(Exception):
    pass


def _load() -> dict:
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(users: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def create_user(username: str, email: str, password: str) -> None:
    username_key = username.strip().lower()
    email_key = email.strip().lower()

    with _lock:
        users = _load()
        for existing in users.values():
            if existing["username"].lower() == username_key:
                raise UserExistsError("That username is already taken.")
            if existing["email"].lower() == email_key:
                raise UserExistsError("That email is already registered.")

        users[username_key] = {
            "username": username.strip(),
            "email": email.strip(),
            "password_hash": hash_password(password),
        }
        _save(users)


def find_user(identifier: str) -> Optional[dict]:
    identifier_key = identifier.strip().lower()
    with _lock:
        users = _load()
    if identifier_key in users:
        return users[identifier_key]
    for user in users.values():
        if user["email"].lower() == identifier_key:
            return user
    return None


def verify_user_login(identifier: str, password: str) -> bool:
    user = find_user(identifier)
    if not user:
        return False
    return verify_password(password, user["password_hash"])


def _derive_username_from_email(email: str, existing_keys: set) -> str:
    local_part = email.split("@")[0].strip().lower()
    base = "".join(ch for ch in local_part if ch.isalnum()) or "user"
    candidate = base
    suffix = 1
    while candidate in existing_keys:
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


def upsert_google_user(email: str) -> tuple[str, str]:
    """Find or create a local account for a Google-authenticated email, issue
    a freshly generated random password for it, and return (username, password).
    That password is never seen or typed by the user — it's only used
    internally as the credential pair the frontend stores after Google
    sign-in, so the existing username/password-based auth on every other
    request keeps working unchanged for Google-signed-in users too.
    """
    email_key = email.strip().lower()
    new_password = secrets.token_urlsafe(24)

    with _lock:
        users = _load()

        matched_key = None
        for key, user in users.items():
            if user["email"].strip().lower() == email_key:
                matched_key = key
                break

        if matched_key is None:
            matched_key = _derive_username_from_email(email, set(users.keys()))
            users[matched_key] = {
                "username": matched_key,
                "email": email.strip(),
                "password_hash": hash_password(new_password),
            }
        else:
            users[matched_key]["password_hash"] = hash_password(new_password)

        _save(users)
        return users[matched_key]["username"], new_password


def create_password_reset_token(username: str, email: str) -> Optional[str]:
    """Validates that username+email match an existing account, then issues a
    fresh single-use, time-limited reset token stored on that user's record.
    Returns None if there's no matching account (caller decides how to
    respond to that — this function doesn't leak which case it was).
    """
    username_key = username.strip().lower()
    email_key = email.strip().lower()

    with _lock:
        users = _load()
        user = users.get(username_key)
        if not user or user["email"].strip().lower() != email_key:
            return None

        token = secrets.token_urlsafe(32)
        user["reset_token"] = token
        user["reset_token_expires_at"] = time.time() + RESET_TOKEN_TTL_SECONDS
        _save(users)
        return token


def reset_password_with_token(token: str, new_password: str) -> bool:
    """Consumes a reset token issued by create_password_reset_token: resets
    the matching user's password and invalidates the token (single-use).
    Returns False if the token doesn't exist or has expired.
    """
    with _lock:
        users = _load()
        for user in users.values():
            if user.get("reset_token") == token:
                if time.time() > user.get("reset_token_expires_at", 0):
                    return False
                user["password_hash"] = hash_password(new_password)
                user.pop("reset_token", None)
                user.pop("reset_token_expires_at", None)
                _save(users)
                return True
        return False
