import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// 프론트 전용 임시 계정
const TEMP_LOGIN = {
    employeeNum: "admin",
    password: "1234",
};

function pickMessage(data, fallback) {
    return data?.message || data?.msg || data?.error || fallback;
}

// axios 인스턴스 (http.js 안 쓰는 최소 통일)
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

// fetch requestJson과 동일한 느낌으로 유지
async function requestJson(path, { method = "GET", body } = {}) {
    try {
        const res = await api.request({
            url: path,
            method,
            data: body, // POST/PUT 등에서 body로 들어감
            // GET에서 data는 무시되긴 하지만, 깔끔하게 하려면 method별로 분기해도 됨
        });

        const data = res.data ?? {};

        // API body code 에러(정의서 스타일)
        if (typeof data.code !== "undefined" && data.code !== 200) {
            throw new Error(pickMessage(data, "Request failed"));
        }

        return data;
    } catch (err) {
        // axios는 실패 시 여기로 떨어짐(네트워크/4xx/5xx 등)
        const msg = pickMessage(
            err?.response?.data,
            `Request failed${err?.response?.status ? ` (HTTP ${err.response.status})` : ""}`
        );
        throw new Error(msg);
    }
}

// POST /api/user/login
export async function login({ employeeNum, password }) {
    // ✅ 백엔드 연동 전: 임시 계정이면 바로 성공 처리
    if (
        employeeNum === TEMP_LOGIN.employeeNum &&
        password === TEMP_LOGIN.password
    ) {
        console.log("[TEMP LOGIN] backend not connected");
        return { code: 200 };
    }

    // 🔽 그 외는 기존대로 백엔드 호출(백엔드 없으면 에러 뜸)
    return requestJson("/api/user/login", {
        method: "POST",
        body: { employeeNum, password },
    });
}

// POST /api/user/signup
export function signup({ employeeNum, password, username, department }) {
    return requestJson("/api/user/signup", {
        method: "POST",
        body: { employeeNum, password, username, department },
    });
}

// GET /api/user/me (아직 안 쓴다 했으니 그대로 둬도 됨)
export function me() {
    return requestJson("/api/user/me", { method: "GET" });
}

// GET /api/user/logout (아직 안 쓴다 했으니 그대로 둬도 됨)
export function logout() {
    return requestJson("/api/user/logout", { method: "GET" });
}
