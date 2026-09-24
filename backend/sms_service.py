import os

import httpx

TWILIO_MESSAGES_URL_TEMPLATE = "https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"


class SmsNotConfigured(Exception):
    pass


class SmsSendError(Exception):
    pass


def is_configured() -> bool:
    return bool(
        os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        and os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        and os.environ.get("TWILIO_FROM_NUMBER", "").strip()
    )


async def send_test_result_sms(to_phone: str, topic: str, grade: int, score: int, total: int) -> None:
    """Sends a short test-result text via Twilio's REST API directly (Basic
    Auth + form POST) rather than the full twilio SDK — one less dependency
    for a single API call.
    """
    percent = round((score / total) * 100) if total else 0
    body = f"Math Assistant: {topic} (Grade {grade}) test result - {score}/{total} ({percent}%)."
    await _send_sms(to_phone, body)


async def send_password_reset_sms(to_phone: str, username: str, reset_link: str) -> None:
    body = (
        f"Math Assistant: hi {username}, reset your password here (valid for 1 hour): {reset_link} "
        "If you didn't ask for this, ignore this message."
    )
    await _send_sms(to_phone, body)



async def send_otp_sms(to_phone: str, code: str, action: str) -> None:
    body = f"Math Assistant: your code to {action} is {code}. It expires in 10 minutes. Don't share it."
    await _send_sms(to_phone, body)


def _to_e164(phone: str) -> str:
    """Twilio needs E.164 (+<country><number>). Numbers saved without a "+"
    get SMS_DEFAULT_COUNTRY_CODE (India, +91, by default) prepended."""
    digits = "".join(ch for ch in phone if ch.isdigit())
    if phone.strip().startswith("+"):
        return f"+{digits}"
    country_code = os.environ.get("SMS_DEFAULT_COUNTRY_CODE", "+91").strip().lstrip("+") or "91"
    return f"+{country_code}{digits.lstrip('0')}"


async def _send_sms(to_phone: str, body: str) -> None:
    to_phone = _to_e164(to_phone)
    if not is_configured():
        raise SmsNotConfigured(
            "SMS sending is not configured on this server "
            "(TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER)."
        )

    account_sid = os.environ["TWILIO_ACCOUNT_SID"].strip()
    auth_token = os.environ["TWILIO_AUTH_TOKEN"].strip()
    from_number = os.environ["TWILIO_FROM_NUMBER"].strip()

    url = TWILIO_MESSAGES_URL_TEMPLATE.format(account_sid=account_sid)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                url,
                auth=(account_sid, auth_token),
                data={"To": to_phone, "From": from_number, "Body": body},
            )
    except Exception as exc:
        raise SmsSendError(f"Failed to send the SMS: {exc}") from exc

    if response.status_code >= 300:
        raise SmsSendError(f"Twilio rejected the SMS ({response.status_code}): {response.text[:300]}")
