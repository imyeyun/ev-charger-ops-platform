import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// 공통 응답 처리 핸들러
function assertSuccess(response) {
  const payload = response.data;
  if (!payload) throw new Error("Empty response");

  // 명세서 상 200이 아닌 경우 에러 처리
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
 * 1) 민원 리스트 조회
 * GET /api/request
 */
export async function fetchComplaintList() {
  const res = await api.get("/api/request");
  const payload = assertSuccess(res);
  
  // 명세서 상 200 응답 바로 아래가 배열인 형태 대응
  // 만약 실제 응답이 [ {reqId: 2, ...}, ... ] 라면 payload가 곧 리스트
  return Array.isArray(payload) ? payload : (payload.data || []);
}

/**
 * 2) 민원 상세 보기
 * POST /api/request
 */
export async function fetchComplaintDetail(reqId) {
  if (!reqId) throw new Error("reqId is required");

  // 명세서에 바디가 [{ "reqId": int }] 형태로 그려져 있다면 아래와 같이 배열로 감싸기
  // 만약 일반적인 객체 형태라면 { reqId: Number(reqId) } 로 수정 필요.
  const res = await api.post("/api/request", [{ reqId: Number(reqId) }]); 
  const payload = assertSuccess(res);

  return {
    request: payload.request || {},
    outbounds: payload.outbounds || [],
  };
}

/**
 * 3) 민원 처리
 * POST /api/request_outbound
 */
export async function processComplaints(reqIds) {
  if (!Array.isArray(reqIds) || reqIds.length === 0) {
    throw new Error("reqIds must be a non-empty array");
  }

  const normalized = reqIds.map((x) => Number(x)).filter((n) => !Number.isNaN(n));

  const res = await api.post("/api/request_outbound", { reqIds: normalized });
  const payload = assertSuccess(res);

  return {
    requestedCount: payload.requestedCount || 0,
    successCount: payload.successCount || 0,
    results: payload.results || [],
  };
}

export default api;