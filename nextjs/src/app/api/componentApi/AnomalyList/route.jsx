import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

// 백엔드와의 통신을 위한 axios 인스턴스 생성
const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 300000,
});

function assertSuccess(response) {
    const payload = response.data;
    if (!payload) throw new Error("Empty response");

    if (payload.code && payload.code !== 200) {
        const msg = payload.message || "요청 처리 중 오류가 발생했습니다.";
        throw new Error(msg);
    }

    return payload;
}

/**
 * GET /api/componentApi/AnomalyList
 * (백엔드) GET /api/anomaly
 */
export async function GET() {
    try {
        const res = await api.get("/api/anomaly");
        const payload = assertSuccess(res);

        return NextResponse.json(payload, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "요청 처리 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}