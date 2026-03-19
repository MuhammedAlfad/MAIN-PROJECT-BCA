import smtplib
from email.message import EmailMessage

from app.config import settings


class EmailService:
    @staticmethod
    def _print_console_email(recipient: str, subject: str, body: str):
        print("")
        print("=== EMAIL OTP FALLBACK ===")
        print(f"To: {recipient}")
        print(f"Subject: {subject}")
        print(body)
        print("==========================")
        print("")

    @staticmethod
    def send_email(recipient: str, subject: str, body: str) -> str:
        normalized_recipient = str(recipient or "").strip()
        if not normalized_recipient:
            raise ValueError("Recipient email is required")

        if settings.SMTP_HOST and settings.SMTP_FROM_EMAIL:
            try:
                message = EmailMessage()
                message["Subject"] = subject
                message["From"] = settings.SMTP_FROM_EMAIL
                message["To"] = normalized_recipient
                message.set_content(body)

                if settings.SMTP_USE_SSL:
                    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
                        if settings.SMTP_USERNAME:
                            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                        server.send_message(message)
                else:
                    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
                        if settings.SMTP_USE_TLS:
                            server.starttls()
                        if settings.SMTP_USERNAME:
                            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                        server.send_message(message)

                return "smtp"
            except Exception:
                if not settings.EMAIL_FALLBACK_TO_CONSOLE:
                    raise

        if settings.EMAIL_FALLBACK_TO_CONSOLE:
            EmailService._print_console_email(normalized_recipient, subject, body)
            return "console"

        raise ValueError("Email service is not configured")

    @staticmethod
    def send_otp_email(recipient: str, otp: str, purpose: str) -> str:
        normalized_purpose = "login" if purpose == "login" else "registration"
        subject = f"Trip Planner {normalized_purpose.title()} OTP"
        body = (
            f"Your Trip Planner {normalized_purpose} OTP is {otp}.\n\n"
            f"This OTP expires in {settings.OTP_EXPIRE_MINUTES} minutes.\n"
            "If you did not request this, you can ignore this email."
        )
        return EmailService.send_email(recipient, subject, body)
