import axios from "axios";
import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.API_BASE_URL || "http://localhost:8080";
const FRONT_PDF_PREFIX = "/pdf";

/* (A) 서버에서 프론트 origin 만들기 */
function getRequestOrigin(req) {
    const origin = req.headers.get("origin");
    if (origin) return origin;

    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return `${proto}://${host}`;
}

/* (B) 저장소/백엔드 경로 → 프론트 URL 정규화 */
function normalizeToFrontUrl(rawPath, origin) {
    const cleaned = rawPath.split("?")[0];
    const fileName = cleaned.split("/").pop();
    return `${origin}${FRONT_PDF_PREFIX}/${fileName}`;
}

/* (C) 실제 파일 존재 체크 */
async function existsFile(url) {
    const res = await axios.head(url, { validateStatus: () => true });
    return res.status >= 200 && res.status < 300;
}

/* (D) 최종 POST 핸들러 */
export async function POST(req) {
    const payload = await req.json();

    // 1️⃣ 백엔드 호출
    const backendRes = await axios.post(
        `${BACKEND_BASE}/api/report`,
        payload,
        { validateStatus: () => true }
    );

    if (backendRes.status < 200 || backendRes.status >= 300) {
        return NextResponse.json(
            backendRes.data,
            { status: backendRes.status }
        );
    }

    // 2️⃣ filePath 추출
    const rawPath = backendRes.data.filePath;
    if (!rawPath) {
        return NextResponse.json(
            { message: "filePath 없음" },
            { status: 500 }
        );
    }

    // 3️⃣ 프론트 URL로 정규화
    const origin = getRequestOrigin(req);
    const fileUrl = normalizeToFrontUrl(rawPath, origin);

    // 4️⃣ 파일 존재 확인
    const ok = await existsFile(fileUrl);
    if (!ok) {
        return NextResponse.json(
            { message: "파일 없음" },
            { status: 404 }
        );
    }

    // 5️⃣ 최종 응답
    return NextResponse.json(
        { fileUrl },
        { status: 200 }
    );
}