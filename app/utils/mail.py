import smtplib
import ssl
from email.message import EmailMessage
import os
from typing import List

def send_email(
    subject: str,
    recipients: List[str],
    body: str,
    subtype: str = "plain",
) -> None:
    """
    Send an email using SMTP configuration from environment variables.

    Expected environment variables:
        SMTP_HOST: SMTP server hostname
        SMTP_PORT: SMTP server port (default 587)
        SMTP_USER: username for authentication (optional)
        SMTP_PASSWORD: password for authentication (optional)
        SMTP_TLS: whether to use STARTTLS (default "true")
        SMTP_FROM: sender email address (defaults to SMTP_USER if set)
    """
    smtp_host = os.getenv("SMTP_HOST", "localhost")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_tls = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "no-reply@example.com")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = ", ".join(recipients)
    msg.set_content(body, subtype=subtype)

    context = ssl.create_default_context()

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        if smtp_tls:
            server.starttls(context=context)
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
        server.send_message(msg)