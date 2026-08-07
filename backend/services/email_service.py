"""
Email verification service using aiosmtplib.

Generates secure random tokens, stores them in MongoDB with a 24-hour TTL,
and sends beautifully formatted HTML emails. All SMTP credentials are
loaded from environment variables — never hardcoded.

Dev mode: if SMTP_EMAIL / SMTP_APP_PASSWORD are not set, the verify URL
is logged to the console instead of sent by email.
"""

import secrets
from datetime import datetime, timedelta, timezone

from config.settings import get_settings
from core.database import get_database
from core.logging import get_logger

logger = get_logger(__name__)

TOKEN_TTL_HOURS = 24


async def create_verification_token(user_id: str, email: str) -> str:
    """Generate a secure verification token and persist it.

    Returns:
        The plaintext token (sent to the user via email link).
    """
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)

    logger.debug(
        "token_generated",
        user_id=user_id,
        email=email,
        token_prefix=token[:12],
        expires_at=expires_at.isoformat(),
    )

    db = get_database()
    # Clean up any existing tokens for this user before creating a new one
    del_result = await db["verification_tokens"].delete_many({"user_id": user_id})
    logger.debug("old_tokens_deleted", user_id=user_id, deleted_count=del_result.deleted_count)

    insert_result = await db["verification_tokens"].insert_one(
        {
            "user_id": user_id,
            "email": email,
            "token": token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }
    )
    logger.info(
        "token_persisted",
        user_id=user_id,
        email=email,
        inserted_id=str(insert_result.inserted_id),
        token_prefix=token[:12],
    )
    return token


async def verify_token(token: str) -> dict:
    """Validate a verification token. Returns a structured result dict.

    Returns:
        {"ok": True, "user_id": "..."} on success
        {"ok": False, "code": "TOKEN_EXPIRED" | "TOKEN_ALREADY_USED" | "INVALID_TOKEN"}
    """
    logger.debug("verify_token_lookup", token_prefix=token[:12] if token else "EMPTY")

    db = get_database()
    doc = await db["verification_tokens"].find_one({"token": token})

    if not doc:
        logger.warning("verify_token_not_found", token_prefix=token[:12] if token else "EMPTY")
        return {"ok": False, "code": "INVALID_TOKEN"}

    logger.debug("verify_token_found", user_id=doc["user_id"], email=doc.get("email"))

    # Make expires_at timezone-aware before comparing
    expires_at = doc["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        await db["verification_tokens"].delete_one({"_id": doc["_id"]})
        logger.warning("verify_token_expired", user_id=doc["user_id"], expired_at=expires_at.isoformat())
        return {"ok": False, "code": "TOKEN_EXPIRED"}

    # Token is valid — consume it (one-time use)
    await db["verification_tokens"].delete_one({"_id": doc["_id"]})
    logger.info("verify_token_success", user_id=doc["user_id"])
    return {"ok": True, "user_id": doc["user_id"]}


async def send_verification_email(email: str, full_name: str, token: str) -> None:
    """Send an HTML verification email via SMTP.

    Falls back to logging the verify URL when SMTP is not configured.
    This allows full development without real email credentials.
    """
    settings = get_settings()
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"

    if not settings.smtp_email or not settings.smtp_app_password:
        # ── Development fallback ───────────────────────────────────────────
        logger.warning(
            "smtp_not_configured_dev_mode",
            message="SMTP not configured — verification link printed below.",
            verify_url=verify_url,
            email=email,
        )
        print(f"\n{'='*60}\n📧 DEV MODE — Verification link for {email}:\n{verify_url}\n{'='*60}\n")
        return

    # ── Production: send real email ────────────────────────────────────────
    import aiosmtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    html_body = _render_verification_email(full_name, verify_url)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your Bhavvi AI account"
    msg["From"] = f"Bhavvi AI <{settings.smtp_email}>"
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=settings.smtp_email,
            password=settings.smtp_app_password,
        )
        logger.info("verification_email_sent", email=email)
    except Exception as exc:
        logger.error("verification_email_failed", email=email, error=str(exc))
        # Don't raise — user is registered; they can resend from the login page
        print(f"\n{'='*60}\n📧 EMAIL FAILED — Fallback verify link for {email}:\n{verify_url}\n{'='*60}\n")


def _render_verification_email(full_name: str, verify_url: str) -> str:
    """Render the branded HTML email body."""
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your Bhavvi AI account</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0f1e;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(99,102,241,0.2);overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px;text-align:center;">
        <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="font-size:26px;">&#10024;</span>
        </div>
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.02em;">Bhavvi AI Assistant</h1>
      </td></tr>
      <tr><td style="padding:40px 36px;">
        <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:700;">Verify your email address</h2>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
          Hi {full_name}, welcome to Bhavvi AI! Please verify your email address to activate your account.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">
            Verify Email Address
          </a>
        </div>
        <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
          This link expires in <strong style="color:#94a3b8;">24 hours</strong>. If you didn't create a Bhavvi AI account, ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid rgba(99,102,241,0.15);margin:28px 0;">
        <p style="margin:0;color:#475569;font-size:12px;">
          Or copy this URL: <a href="{verify_url}" style="color:#6366f1;word-break:break-all;">{verify_url}</a>
        </p>
      </td></tr>
      <tr><td style="padding:20px 36px;background:#0f172a;text-align:center;">
        <p style="margin:0;color:#475569;font-size:12px;">
          &copy; 2026 Bhavvi AI Assistant &middot; Built as a capstone project
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""
