import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

STATUS_MAP = {
    0: "알수없음",
    1: "통신이상",
    2: "충전가능",
    3: "충전중",
    4: "운영중지",
    5: "점검중",
}


def send_alert_email(
    to_email: str,
    stat_id: str,
    stat: int,
    stat_nm: str,
) -> None:
    mail_host = os.environ.get("MAIL_HOST", "smtp.gmail.com")
    mail_port = int(os.environ.get("MAIL_PORT", "587"))
    mail_username = os.environ.get("MAIL_USERNAME", "")
    mail_password = os.environ.get("MAIL_PASSWORD", "")

    status_text = STATUS_MAP.get(stat, f"알수없는 상태({stat})")

    subject = f"[충전소 이상 알림] {stat_nm}"
    body = (
        f"충전소명: {stat_nm}\n"
        f"충전소 ID: {stat_id}\n"
        f"상태: {status_text}\n"
        f"\n확인이 필요합니다."
    )

    msg = MIMEMultipart()
    msg["From"] = mail_username
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    with smtplib.SMTP(mail_host, mail_port) as server:
        server.starttls()
        server.login(mail_username, mail_password)
        server.send_message(msg)
