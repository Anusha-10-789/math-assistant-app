import re
from typing import Optional

MIN_LENGTH = 8
_SPECIAL_CHAR_RE = re.compile(r"[^A-Za-z0-9]")
_UPPERCASE_RE = re.compile(r"[A-Z]")
_DIGIT_RE = re.compile(r"[0-9]")

REQUIREMENTS_TEXT = (
    "Password must be at least 8 characters and include at least one uppercase letter, "
    "one number, and one special character."
)


def validate_password_strength(password: str) -> Optional[str]:
    """Returns an error message if the password fails the policy, or None if it passes."""
    if len(password) < MIN_LENGTH:
        return REQUIREMENTS_TEXT
    if not _UPPERCASE_RE.search(password):
        return REQUIREMENTS_TEXT
    if not _DIGIT_RE.search(password):
        return REQUIREMENTS_TEXT
    if not _SPECIAL_CHAR_RE.search(password):
        return REQUIREMENTS_TEXT
    return None
