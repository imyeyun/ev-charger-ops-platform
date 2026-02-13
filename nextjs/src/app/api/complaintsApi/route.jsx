import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

//백엔드와의 통신을 위한 axios 인스턴스 생성
const api = axios.create({
  baseURL: BACKEND_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// 에이전트 실행 시 시간 많이 걸리므로 긴 호출용 axios 인스턴스 생성
const apiLong = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 180000, // 3분
});

function getBackendMessage(error) {
    // 백엔드가 내려준 { code, message }의 message를 우선 사용하고, 없으면 axios 기본 메시지 -> 그래도 없으면 기본 문구
    // socket hang up/timeout 등의 경우 response가 없으므로 ?. 추가하여 방어하기 위함
    return error?.response?.data?.message || error?.message || "요청 처리 중 오류가 발생했습니다.";
}

function getHttpStatus(error) {
    // 백 바디에 404, 409가 있으면 그걸 우선 사용 -> 없으면 HTTP status(404/409 등) 사용 -> 둘 다 없으면 500
    return error?.response?.data?.code || error?.response?.status || 500;
}

// 공통 응답 처리 핸들러
function assertSuccess(response) {
  const payload = response.data; //백엔드가 준 실제 데이터
  if (!payload) throw new Error("Empty response");

  // 데이터가 없거나, 명세서 상 code가 200이 아니면 에러를 발생시킴
  if (payload.code && payload.code !== 200) {
    const msg = payload.message || "요청 처리 중 오류가 발생했습니다.";
    const err = new Error(msg);
    err.code = payload.code;
    err.payload = payload;
    throw err;
  }

    return payload.data;
}

/**
 * GET /api/complaintsApi
 * 민원 리스트 조회
 */
export async function GET(request) {
  try {
    const res = await api.get("/api/request");

    const list = assertSuccess(res);
    
    return NextResponse.json(list, { status: 200 }); //브라우저에 최종 전달

  } catch (error) {
    console.error("Error fetching complaint list:", error);

    return NextResponse.json(
        { error: getBackendMessage(error), debug: error?.response?.data?.code || error?.code },
        { status: getHttpStatus(error) }
    );
  }
}

/**
 * POST /api/complaintsApi
 * 민원 상세 보기
 * 
 * Body:
 * - { action: "detail", reqId: number }
 * - { action: "process", reqIds: number[] }
 */
export async function POST(request) {
    try {
        // 1) 클라이언트(프론트)에서 보낸 JSON 바디 파싱
        // - 상세 조회 요청: { "reqId": 19 }
        // - 답변 처리 요청: { "reqIds": [12, 15] }
        const body = await request.json();

        // 2) action 제거: reqId / reqIds 존재 여부로 분기
        const { reqId, reqIds } = body;

        // A) 상세 조회 분기: reqId가 "정수 1개"로 들어오는 경우
        // - 명세: reqId는 무조건 int
        // - 프론트: { reqId: 19 } 형태
        if (Number.isInteger(reqId)) {
            // 백엔드 상세 조회 API 호출
            // - 백엔드 스펙: POST /api/request  body: { reqId: 19 }
            const res = await api.post("/api/request", { reqId });

            // 공통 응답 핸들링 (code 체크 등)
            const payload = assertSuccess(res);

            // 프론트에서 쓰기 편한 형태로 반환
            return NextResponse.json(
                {
                    request: payload.request || {},
                    outbounds: payload.outbounds || [],
                },
                { status: 200 }
            );
        }

        // B) 에이전트 처리 분기: reqIds가 "정수 배열"로 들어오는 경우
        // - 명세: { "reqIds": [12, 15] }
        if (Array.isArray(reqIds)) {
            // 비어있는 배열이면 처리할 게 없으니 400
            if (reqIds.length === 0) {
                return NextResponse.json(
                    { error: "reqIds must be a non-empty array" },
                    { status: 400 }
                );
            }

            // 민원 답변 생성 후 일괄 처리 API 호출
            // - 백엔드 스펙: POST /api/request_outbound body: { reqIds: [12, 15] }
            const res = await apiLong.post("/api/request_outbound", { reqIds });

            // 공통 응답 핸들링
            const payload = assertSuccess(res);

            // 처리 결과 요약 반환
            return NextResponse.json(payload, { status: 200 });
        }

        // C) 둘 다 아닌 경우: 클라이언트 요청 바디가 잘못됨
        // - reqId도 없고 reqIds도 없거나,
        // - reqId가 정수가 아니거나, reqIds가 배열이 아닌 경우
        return NextResponse.json(
            { error: "Body must include either integer reqId or array reqIds" },
            { status: 400 }
        );
    } catch (error) {
        // 네트워크 오류(ECONNREFUSED/ETIMEDOUT), 백엔드 에러 코드 등을 콘솔에서 확인
        console.error("Error in complaintsApi route:", error);

        return NextResponse.json(
            { error: getBackendMessage(error), debug: error?.response?.data?.code || error?.code },
            { status: getHttpStatus(error) }
        );
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json().catch(() => null);

        // 기대 스펙: { reqId: 22 }
        const reqIdRaw = body?.reqId;
        const reqId = Number.isInteger(reqIdRaw) ? reqIdRaw : null;

        if (reqId === null) {
            return NextResponse.json(
                { error: "Body must include integer reqId" },
                { status: 400 }
            );
        }

        const cookie = request.headers.get("cookie") || "";

        const res = await fetch(`${BACKEND_BASE}/api/request_outbound/${reqId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...(cookie ? { cookie } : {}),
            },
            cache: "no-store",
        });

        const text = await res.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = null;
        }

        let nextRes;
        if (res.ok) {
            nextRes = NextResponse.json(data ?? { ok: true }, { status: 200 });
        } else {
            nextRes = NextResponse.json(
                {
                    error: "BACKEND_ERROR",
                    status: res.status,
                    body: data !== null ? data : text,
                },
                { status: res.status }
            );
        }

        const setCookie = res.headers.get("set-cookie");
        if (setCookie) {
            nextRes.headers.set("set-cookie", setCookie);
        }

        return nextRes;
    } catch (e) {
        return NextResponse.json(
            { error: String(e?.message || "Internal Server Error") },
            { status: 500 }
        );
    }
}

// export async function DELETE(request) {
//     try {
//         const body = await request.json();
//         const { reqId } = body;
//
//         if (Number.isInteger(reqId)) {
//             const res = await api.delete(`${BACKEND_BASE}/api/request_outbound/${reqId}`);
//
//             const payload = assertSuccess(res);
//
//             return NextResponse.json(payload, { status: 200 });
//         }
//
//         return NextResponse.json(
//             { error: "Body must include integer reqId" },
//             { status: 400 }
//         );
//     } catch (error) {
//         console.error("Error in complaintsApi DELETE route:", error);
//
//         return NextResponse.json(
//             { error: getBackendMessage(error), debug: error?.response?.data?.code || error?.code },
//             { status: getHttpStatus(error) }
//         );
//     }
// }