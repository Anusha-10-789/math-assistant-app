import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


class EmailNotConfigured(Exception):
    pass


class EmailSendError(Exception):
    pass


def is_configured() -> bool:
    return bool(
        os.environ.get("SMTP_HOST", "").strip()
        and os.environ.get("SMTP_USERNAME", "").strip()
        and os.environ.get("SMTP_PASSWORD", "").strip()
    )


def _config() -> dict:
    return {
        "host": os.environ.get("SMTP_HOST", "").strip(),
        "port": int(os.environ.get("SMTP_PORT", "587").strip() or "587"),
        "username": os.environ.get("SMTP_USERNAME", "").strip(),
        "password": os.environ.get("SMTP_PASSWORD", "").strip(),
        "from_email": os.environ.get("SMTP_FROM_EMAIL", "").strip() or os.environ.get("SMTP_USERNAME", "").strip(),
        "use_tls": os.environ.get("SMTP_USE_TLS", "true").strip().lower() != "false",
    }


def send_password_reset_email(to_email: str, username: str, reset_link: str) -> None:
    """Sends a password-reset email via generic SMTP — works with any provider
    (Gmail, SendGrid, Mailgun, Outlook, a custom mail server, ...) since it's
    plain SMTP with configurable host/port/credentials, not tied to one API.
    """
    if not is_configured():
        raise EmailNotConfigured(
            "Email sending is not configured on this server (SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD)."
        )

    config = _config()

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset your Math Assistant password"
    message["From"] = config["from_email"]
    message["To"] = to_email

    text_body = (
        f"Hi {username},\n\n"
        "We received a request to reset your Math Assistant password. Click the link below to "
        "choose a new one:\n\n"
        f"{reset_link}\n\n"
        "This link expires in 1 hour. If you didn't request this, you can safely ignore this email."
    )
    html_body = f"""
    <p>Hi {username},</p>
    <p>We received a request to reset your Math Assistant password. Click the link below to
    choose a new one:</p>
    <p><a href="{reset_link}">{reset_link}</a></p>
    <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    """

    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(config["host"], config["port"], timeout=15) as server:
            if config["use_tls"]:
                server.starttls()
            server.login(config["username"], config["password"])
            server.sendmail(config["from_email"], [to_email], message.as_string())
    except Exception as exc:
        raise EmailSendError(f"Failed to send the reset email: {exc}") from exc
