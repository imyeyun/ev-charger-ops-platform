from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.email_service import send_alert_email

router = APIRouter()


class AlertEmailRequest(BaseModel):
    stat_id: str
    stat: int
    busi_call: str
    stat_nm: str


class AlertEmailResponse(BaseModel):
    message: str


@router.post("/api/notification", response_model=AlertEmailResponse)
async def send_notification(request: AlertEmailRequest):
    try:
        send_alert_email(
            to_email=request.busi_call,
            stat_id=request.stat_id,
            stat=request.stat,
            stat_nm=request.stat_nm,
        )
        return AlertEmailResponse(message="이메일 발송 성공")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        raise HTTPException(status_code=500, detail={"message": "SMTP연결 실패"})
