import axios from "axios";
import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.API_BASE_URL || "http://localhost:8080";

export async function GET(req) {
    try {
        // ✅ 브라우저 → Next 로 넘어온 세션 쿠키를 백엔드로 그대로 전달
        const cookie = req.headers.get("cookie") || "";

        const res = await axios.get(`${BACKEND_BASE}/api/user/me`, {
            headers: {
                "Content-Type": "application/json",
                ...(cookie ? { Cookie: cookie } : {}),
            },
            withCredentials: true,
            validateStatus: () => true, // 401도 throw 안 하게
        });

        const nextRes = NextResponse.json(res.data, {
            status: res.status,
        });

        // (보통 /me는 Set-Cookie가 없지만, 혹시 내려오면 전달)
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
            nextRes.headers.set("set-cookie", setCookie);
        }

        return nextRes;
    } catch (err) {
        return NextResponse.json(
            { message: err?.message || "Auth me route error" },
            { status: 500 }
        );
    }
}
