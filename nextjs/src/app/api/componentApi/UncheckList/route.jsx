import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

// 백엔드와의 통신을 위한 axios 인스턴스 생성
const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

// 공통 응답 처리 핸들러
function assertSuccess(response) {
    const payload = response.data;
    if (!payload) throw new Error("Empty response");

    // 백엔드가 { code, message, ... } 형태면 코드 검사
    if (payload.code && payload.code !== 200) {
        const msg = payload.message || "요청 처리 중 오류가 발생했습니다.";
        throw new Error(msg);
    }

    return payload;
}

/**
 * GET /api/componentApi/UncheckList
 * 상태 미확인(이상) 충전소 리스트 조회
 * (백엔드) GET /api/uncheckList
 */
export async function GET() {
    try {
        const res = await api.get("/api/uncheckList");
        const payload = assertSuccess(res);

        // 스펙 그대로 반환: { chargerBadCaseList: [...] }
        return NextResponse.json(payload, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "요청 처리 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}