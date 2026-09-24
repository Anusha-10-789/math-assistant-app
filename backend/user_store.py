import hashlib
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
SESSION_TOKEN_PREFIX = "otp_"
SESSION_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60
MAX_SESSION_TOKENS = 10

_lock = threading.Lock()


class UserExistsError(Exception):
    pass


# Where accounts live. With DATABASE_URL set (a Postgres URL, e.g. from Neon
# or Supabase), they're kept in the database — needed on hosts like Render's
# free plan, whose disk is wiped on every restart/redeploy. Without it (local
# development), they're kept in data/users.json as before.
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

# The whole account list is one small JSON document, so it's kept as a single
# row and cached in memory; this app runs as one process, so the cache stays
# in step with the database and most requests never need a round trip.
_db_cache: Optional[str] = None


def _db_connect():
    import psycopg  # only needed when DATABASE_URL is set

    return psycopg.connect(DATABASE_URL, autocommit=True, connect_timeout=10)


def _db_load() -> str:
    global _db_cache
    if _db_cache is None:
        with _db_connect() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS app_store (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            row = conn.execute("SELECT value FROM app_store WHERE key = 'users'").fetchone()
        _db_cache = row[0] if row else "{}"
    return _db_cache


def _db_save(raw: str) -> None:
    global _db_cache
    with _db_connect() as conn:
        conn.execute(
            "INSERT INTO app_store (key, value) VALUES ('users', %s) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            (raw,),
        )
    _db_cache = raw


def _load() -> dict:
    if DATABASE_URL:
        return json.loads(_db_load())
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(users: dict) -> None:
    if DATABASE_URL:
        _db_save(json.dumps(users))
        return
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def normalize_phone(phone: str) -> str:
    """Strips spaces, dashes, dots and brackets so "+91 98765-43210" and
    "+919876543210" compare equal. A leading "+" is kept."""
    phone = phone.strip()
    digits = "".join(ch for ch in phone if ch.isdigit())
    return f"+{digits}" if phone.startswith("+") else digits


def _phones_match(a: str, b: str) -> bool:
    # Compare on the last 10 digits so "+919876543210" matches "9876543210".
    a_digits = "".join(ch for ch in a if ch.isdigit())
    b_digits = "".join(ch for ch in b if ch.isdigit())
    return bool(a_digits) and bool(b_digits) and a_digits[-10:] == b_digits[-10:]


def _normalize_answer(answer: str) -> str:
    # "  Delhi Public School " and "delhi   public school" should both match.
    return " ".join(answer.strip().lower().split())


def create_user(
    email: str,
    phone: str,
    password: str,
    security_question: str = "",
    security_answer: str = "",
    username: str = "",
) -> str:
    """Creates an account and returns its username. The email address and
    mobile number are what the student logs in with; the username is only an
    internal key, derived from the email when none is given."""
    email_key = email.strip().lower()
    phone = normalize_phone(phone)

    with _lock:
        users = _load()
        for existing in users.values():
            if existing["email"].lower() == email_key:
                raise UserExistsError("That email is already registered. Please log in instead.")
            if phone and _phones_match(existing.get("phone", ""), phone):
                raise UserExistsError("That mobile number is already registered. Please log in instead.")

        username_key = username.strip().lower()
        if username_key and username_key in users:
            raise UserExistsError("That username is already taken.")
        if not username_key:
            username_key = _derive_username_from_email(email, set(users.keys()))

        user = {
            "username": username.strip() or username_key,
            "email": email.strip(),
            "phone": phone,
            "password_hash": hash_password(password),
        }
        if security_question.strip() and security_answer.strip():
            user["security_question"] = security_question.strip()
            user["security_answer_hash"] = hash_password(_normalize_answer(security_answer))
        users[username_key] = user
        _save(users)
        return user["username"]


def _find_in(users: dict, identifier: str) -> Optional[dict]:
    """Matches a username, an email address or a mobile number."""
    identifier_key = identifier.strip().lower()
    if not identifier_key:
        return None
    if identifier_key in users:
        return users[identifier_key]
    for user in users.values():
        if user["email"].strip().lower() == identifier_key:
            return user
    if "@" not in identifier_key and sum(ch.isdigit() for ch in identifier_key) >= 10:
        for user in users.values():
            if _phones_match(user.get("phone", ""), identifier_key):
                return user
    return None


def find_user(identifier: str) -> Optional[dict]:
    with _lock:
        users = _load()
    return _find_in(users, identifier)


def verify_user_login(identifier: str, password: str) -> bool:
    user = find_user(identifier)
    if not user:
        return False
    if password.startswith(SESSION_TOKEN_PREFIX):
        digest = _sha256(password)
        now = time.time()
        if any(
            secrets.compare_digest(t["hash"], digest) and t["expires_at"] > now
            for t in user.get("session_tokens", [])
        ):
            return True
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


def create_password_reset_token(identifier: str) -> Optional[tuple[str, dict, str]]:
    """Looks up an account by email, phone number or username, then issues a
    fresh single-use, time-limited reset token stored on that user's record.
    Returns (token, user, channel) where channel is "sms" when the account was
    matched by phone number and "email" otherwise, or None if no account matches.
    """
    identifier_key = identifier.strip().lower()

    with _lock:
        users = _load()
        channel = "email"
        user = next((u for u in users.values() if u["email"].strip().lower() == identifier_key), None)
        if not user and "@" not in identifier_key:
            user = next((u for u in users.values() if _phones_match(u.get("phone", ""), identifier_key)), None)
            if user:
                channel = "sms"
        if not user:
            user = users.get(identifier_key)
        if not user:
            return None

        token = secrets.token_urlsafe(32)
        user["reset_token"] = token
        user["reset_token_expires_at"] = time.time() + RESET_TOKEN_TTL_SECONDS
        _save(users)
        return token, user, channel


def get_recovery_options(identifier: str) -> Optional[dict]:
    """What the "Forgot password?" screen can offer this account: its
    security question (if one was set) and a masked email to send a code to."""
    user = find_user(identifier)
    if not user:
        return None
    return {
        "security_question": user.get("security_question", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
    }


def reset_password_with_security_answer(identifier: str, answer: str, new_password: str) -> bool:
    with _lock:
        users = _load()
        user = _find_in(users, identifier)
        if not user or not user.get("security_answer_hash"):
            return False
        if not verify_password(_normalize_answer(answer), user["security_answer_hash"]):
            return False
        user["password_hash"] = hash_password(new_password)
        # A new password signs out any code-based sessions too.
        user.pop("session_tokens", None)
        _save(users)
        return True


def set_security_question(identifier: str, question: str, answer: str) -> bool:
    with _lock:
        users = _load()
        user = _find_in(users, identifier)
        if not user:
            return False
        user["security_question"] = question.strip()
        user["security_answer_hash"] = hash_password(_normalize_answer(answer))
        _save(users)
        return True


def set_password(identifier: str, new_password: str) -> bool:
    """Used after a one-time code has proved the student owns the account."""
    with _lock:
        users = _load()
        user = _find_in(users, identifier)
        if not user:
            return False
        user["password_hash"] = hash_password(new_password)
        # A new password signs out any code-based sessions too.
        user.pop("session_tokens", None)
        _save(users)
        return True


def create_session_token(identifier: str) -> Optional[str]:
    """After logging in with a one-time code there's no password to send on
    every request, so the student gets a long random token instead, used in
    the password's place. Only its SHA-256 is stored."""
    token = SESSION_TOKEN_PREFIX + secrets.token_urlsafe(32)
    now = time.time()
    with _lock:
        users = _load()
        user = _find_in(users, identifier)
        if not user:
            return None
        sessions = [t for t in user.get("session_tokens", []) if t["expires_at"] > now]
        sessions.append({"hash": _sha256(token), "expires_at": now + SESSION_TOKEN_TTL_SECONDS})
        user["session_tokens"] = sessions[-MAX_SESSION_TOKENS:]
        _save(users)
    return token


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


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
                # A new password signs out any code-based sessions too.
                user.pop("session_tokens", None)
                user.pop("reset_token", None)
                user.pop("reset_token_expires_at", None)
                _save(users)
                return True
        return False
