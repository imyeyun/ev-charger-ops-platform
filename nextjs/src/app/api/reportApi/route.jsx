import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

export const runtime = "nodejs";

const REPORT_ENDPOINT = `${BACKEND_BASE}/api/report`;

function normalizeReportType(rawType) {
    const type = String(rawType || "").trim().toLowerCase();
    if (type === "audit") return "audit";
    if (type === "custom") return "custom";
    // 기존 UI의 "월별 보고서" 값(monthly)은 custom으로 매핑
    if (type === "monthly") return "custom";
    return "";
}

function normalizeDateTime(raw, boundary) {
    const value = String(raw || "").trim();
    if (!value) return "";
    if (value.includes(" ")) return value;
    return `${value} ${boundary === "start" ? "00:00:00" : "23:59:59"}`;
}

function pickErrorMessage(data, fallback) {
    if (!data) return fallback;
    if (typeof data === "string" && data.trim()) return data.trim();
    if (data.message && String(data.message).trim()) return String(data.message).trim();
    if (data.error && String(data.error).trim()) return String(data.error).trim();
    return fallback;
}

function toAllowedPdfUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return null;

    try {
        const parsed = new URL(rawUrl);
        const protocolOk = parsed.protocol === "https:" || parsed.protocol === "http:";
        const hostOk = parsed.hostname.includes("amazonaws.com");
        if (!protocolOk || !hostOk) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

export async function GET(req) {
    const url = new URL(req.url);
    const rawSrc = url.searchParams.get("src");
    const download = url.searchParams.get("download") === "1";

    const src = toAllowedPdfUrl(rawSrc);
    if (!src) {
        return NextResponse.json({ message: "유효한 PDF URL이 필요합니다." }, { status: 400 });
    }

    try {
        const pdfRes = await axios.get(src, {
            responseType: "arraybuffer",
            validateStatus: () => true,
            timeout: 60000,
        });

        if (pdfRes.status < 200 || pdfRes.status >= 300) {
            return NextResponse.json(
                { message: "PDF를 불러오지 못했습니다." },
                { status: pdfRes.status || 502 }
            );
        }

        const headers = new Headers();
        const sourceContentType = String(pdfRes.headers?.["content-type"] || "");
        headers.set(
            "Content-Type",
            sourceContentType.toLowerCase().includes("pdf")
                ? sourceContentType
                : "application/pdf"
        );
        headers.set(
            "Content-Disposition",
            `${download ? "attachment" : "inline"}; filename="report.pdf"`
        );
        headers.set("Cache-Control", "no-store");

        return new Response(pdfRes.data, { status: 200, headers });
    } catch (e) {
        return NextResponse.json(
            { message: String(e?.message || "PDF 프록시 처리 중 오류가 발생했습니다.") },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));

        const inputPrompt = String(body?.prompt ?? body?.input_prompt ?? "").trim();
        const startTime = normalizeDateTime(
            body?.dataStartTime ?? body?.startDate ?? body?.start_time,
            "start"
        );
        const endTime = normalizeDateTime(
            body?.dataEndTime ?? body?.endDate ?? body?.end_time,
            "end"
        );
        const reportType = normalizeReportType(body?.reportType ?? body?.report_type);

        if (!inputPrompt) {
            return NextResponse.json({ message: "프롬프트를 입력해주세요." }, { status: 400 });
        }
        if (!startTime || !endTime) {
            return NextResponse.json({ message: "시작일/종료일을 입력해주세요." }, { status: 400 });
        }
        if (!reportType) {
            return NextResponse.json({ message: "report_type은 audit 또는 custom이어야 합니다." }, { status: 400 });
        }

        const backendPayload = {
            input_prompt: inputPrompt,
            start_time: startTime,
            end_time: endTime,
            report_type: reportType,
        };

        const backendRes = await axios.post(REPORT_ENDPOINT, backendPayload, {
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
            timeout: 300000,
        });

        if (backendRes.status < 200 || backendRes.status >= 300) {
            return NextResponse.json(
                { message: pickErrorMessage(backendRes.data, "보고서 생성 요청에 실패했습니다.") },
                { status: backendRes.status || 500 }
            );
        }

        const s3Url = backendRes.data?.s3_url;
        if (!s3Url || typeof s3Url !== "string") {
            return NextResponse.json({ message: "응답에 s3_url이 없습니다." }, { status: 500 });
        }

        return NextResponse.json({ fileUrl: s3Url }, { status: 200 });
    } catch (e) {
        return NextResponse.json(
            { message: String(e?.message || "보고서 API 처리 중 오류가 발생했습니다.") },
            { status: 500 }
        );
    }
}
