import axios from "axios";
import { NextResponse } from "next/server";

//백엔드와의 통신을 위한 axios 인스턴스 생성
const api = axios.create({
  baseURL: process.env.BACKEND_URL,
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

  return payload;
}

/**
 * GET /api/complaintsApi
 * 민원 리스트 조회
 */
export async function GET(request) {
  try {
    const res = await api.get("/api/request");
    const payload = assertSuccess(res);
    
    // 데이터가 배열인지 확인 후 추출
    const list = Array.isArray(payload) ? payload : (payload.data || []);
    
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
    const body = await request.json();
    const { action, reqId, reqIds } = body;

    if (action === "detail") {
      // 민원 상세 보기
      if (!reqId) {
        return NextResponse.json(
          { error: "reqId is required" },
          { status: 400 }
        );
      }

      const res = await api.post("/api/request", [{ reqId: Number(reqId) }]);
      const payload = assertSuccess(res);

      return NextResponse.json(
        {
          request: payload.request || {},
          outbounds: payload.outbounds || [],
        },
        { status: 200 }
      );
    } else if (action === "process") {
      // 민원 처리 완료
      if (!Array.isArray(reqIds) || reqIds.length === 0) {
        return NextResponse.json(
          { error: "reqIds must be a non-empty array" },
          { status: 400 }
        );
      }
      
      // 데이터 정제 (민원 id -> 문자열 형태 등일 경우 모두 숫자로 변환)
      const normalized = reqIds
        .map((x) => Number(x))
        .filter((n) => !Number.isNaN(n));

      // 민원 처리
      const res = await api.post("/api/request_outbound", { reqIds: normalized });
      const payload = assertSuccess(res);

      // 몇 건 중 몇 건 성공했는지 등에 대한 정보를 반환
      return NextResponse.json(
        {
          requestedCount: payload.requestedCount || 0,
          successCount: payload.successCount || 0,
          results: payload.results || [],
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in complaintsApi route:", error);
    return NextResponse.json(
      { error: error.message || "요청 처리 중 오류가 발생했습니다." },
      { status: error.code || 500 }
    );
  }
}
