from pydantic import BaseModel, Field, ConfigDict
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Optional, Any, Dict, List
import app.services.custom_report as custom_report
import app.services.audit_report as audit_report
import os, boto3
from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

router = APIRouter()

class reportInput(BaseModel):
    input_prompt: str = Field(..., example="기본적인 전기차 충전소 보고서를 작성해줘")
    start_time: Optional[str] = Field(None, example="2026-01-15 00:00:00")
    end_time: Optional[str] = Field(None, example="2026-01-17 23:59:59")
    report_type: Optional[str] = Field("custom", example="custom")

class reportResponse(BaseModel):
    s3_path: str = Field(..., example="test.pdf")


@router.post("/api/report", response_model=reportResponse)
async def generate_report(
    payload: reportInput = Body(...),
    request: Request = None,
) -> reportResponse:
    req = payload

    if req.report_type == "custom":
        try:
            custom_report.custom_report_main(req.input_prompt, req.start_time, req.end_time)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Custom report generation failed: {str(e)}")
        
        output_pdf_path = custom_report.OUTPUT_PDF_DIR

    
    else:
        try:
            audit_report.audit_report_main(req.input_prompt, req.start_time, req.end_time)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Audit report generation failed: {str(e)}")
        
        output_pdf_path = audit_report.OUTPUT_PDF_DIR


    BASE_DIR = Path(__file__).resolve().parent.parent
    load_dotenv(BASE_DIR / ".env")
    
    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
    REGION = os.getenv("AWS_REGION")
    BUCKET_NAME = os.getenv("AWS_S3_BUCKET")

    s3 = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=REGION
    )

    s3_path = "pdf/test.pdf"
    s3.upload_file(output_pdf_path, BUCKET_NAME, s3_path)

    return reportResponse(s3_path=s3_path)

if __name__ == "__main__":
    # For local testing
    BASE_DIR = Path(__file__).resolve().parent.parent
    load_dotenv(BASE_DIR / ".env")

    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
    REGION = os.getenv("AWS_REGION")
    BUCKET_NAME = os.getenv("AWS_S3_BUCKET")

    print(AWS_ACCESS_KEY)
    print(AWS_SECRET_KEY)
    print(REGION)
    print(BUCKET_NAME)