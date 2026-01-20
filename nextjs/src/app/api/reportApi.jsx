// src/api/reportApi.jsx
import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
    headers: { "Content-Type": "application/json" },
});

/**
 * 저장소/백엔드에서 받은 경로를
 * "프론트에서 바로 열 수 있는 절대 URL"로 통일
 */
function normalizeToFrontUrl(rawPath) {
    if (!rawPath) return null;

    // 이미 절대 URL이면 그대로 사용
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
        return rawPath;
    }

    // 예: reports/abc.pdf → /pdf/abc.pdf
    const fileName = rawPath.split("/").pop();
    const frontPath = `/pdf/${fileName}`;

    // 절대경로로 변환
    return `${window.location.origin}${frontPath}`;
}

/**
 * 실제 파일 존재 여부 체크 (404 방지)
 */
async function existsFile(url) {
    try {
        const res = await fetch(url, { method: "HEAD" });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * 보고서 생성 + 링크 정리까지 한 번에 처리
 * page에서는 이 함수만 호출하면 됨
 */
async function generateAndResolve(payload) {
    try {
        const res = await api.post("/api/report", payload);

        const rawPath = res.data?.filePath;
        if (!rawPath) {
            throw new Error("보고서 파일 경로를 받지 못했습니다.");
        }

        // 1️⃣ 프론트 기준 절대 URL로 정규화
        const fileUrl = normalizeToFrontUrl(rawPath);

        // 2️⃣ 실제 파일 존재 체크
        const ok = await existsFile(fileUrl);
        if (!ok) {
            throw new Error("보고서 파일이 존재하지 않습니다.");
        }

        return {
            fileUrl,
            reportId: res.data?.reportId,
        };
    } catch (e) {
        throw new Error(e.message || "보고서 생성 중 오류가 발생했습니다.");
    }
}

export default {
    generateAndResolve,
};

// pdf 다운로드 파일 체크
async function validateDownload(fileUrl) {
    const ok = await existsFile(fileUrl);
    if (!ok) {
        throw new Error("다운로드할 파일이 존재하지 않습니다.");
    }
    return fileUrl;
}