// src/api/reportApi.jsx
import axios from "axios";

/**
 * baseURL:
 * - 보통 백엔드 API 서버 주소를 둠 (예: http://1.2.3.6:8080)
 * - Next.js에서는 NEXT_PUBLIC_BACKEND_URL 로 관리하는게 편함
 */
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: false, // 쿠키 인증 쓰면 true로
});

/**
 * 보고서 생성
 * POST /api/report
 * payload 예:
 *  - reportType: "audit" | "monthly" | "custom"
 *  - prompt: string
 *  - dataStartTime?: string | null
 *  - dataEndTime?: string | null
 *
 * 기대 응답 예:
 *  - { reportId, filePath, createdTime, ... }
 */
export async function createReport(payload) {
    try {
        const res = await api.post("/api/report", payload);
        return res.data;
    } catch (err) {
        const status = err?.response?.status;
        const message =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "보고서 생성 중 오류가 발생했습니다.";

        const e = new Error(message);
        e.status = status;
        throw e;
    }
}

export default { createReport };
