import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

//백엔드와의 통신을 위한 axios 인스턴스 생성
const api = axios.create({
  baseURL: BACKEND_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

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

    // ✅ 안전장치: error.code가 숫자가 아니면 500으로 강제 지정
    // (현재 백 연결이 안돼서 ECONNREFUSED 같은 문자열이 들어오는 것을 방지)
    const safeStatus = Number.isInteger(error.code) && error.code >= 200 && error.code <= 599 
      ? error.code 
      : 500;

    return NextResponse.json(
      { 
        error: error.message || "민원 리스트를 불러오지 못했습니다.",
        debug: error.code // 브라우저에서 원인을 알 수 있게 에러 코드는 본문에 포함
      },
      { status: safeStatus }
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
            const res = await api.post("/api/request_outbound", { reqIds });

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

        // error.code가 숫자(HTTP status)인 경우만 status로 사용, 아니면 500
        const safeStatus =
            Number.isInteger(error.code) && error.code >= 200 && error.code <= 599
                ? error.code
                : 500;

        return NextResponse.json(
            {
                error: error.message || "요청 처리 중 오류가 발생했습니다.",
                debug: error.code, // 클라이언트에서도 원인 파악 가능하게
            },
            { status: safeStatus }
        );
    }
}