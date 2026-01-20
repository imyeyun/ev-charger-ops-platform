const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// 프론트 전용 임시 계정
const TEMP_LOGIN = {
    employeeNum: "admin",
    password: "1234",
};

if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

function toUrl(pathOrUrl) {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${API_BASE}${pathOrUrl}`;
}

function pickMessage(data, fallback) {
    return data?.message || data?.msg || data?.error || fallback;
}

async function requestJson(pathOrUrl, { method = "GET", body } = {}) {
    const res = await fetch(toUrl(pathOrUrl), {
        method,
        headers: { "Content-Type": "application/json" },
        // 쿠키 기반 인증 대비
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }

    // HTTP status 에러
    if (!res.ok) {
        throw new Error(pickMessage(data, `Request failed (HTTP ${res.status})`));
    }

    // API body code 에러(정의서 스타일)
    if (data && typeof data.code !== "undefined" && data.code !== 200) {
        throw new Error(pickMessage(data, "Request failed"));
    }

    return data ?? {};
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

    // 🔽 그 외는 기존대로 백엔드 호출
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

// GET /api/user/me
export function me() {
    return requestJson("/api/user/me");
}

// GET /api/user/logout
export function logout() {
    return requestJson("/api/user/logout");
}
