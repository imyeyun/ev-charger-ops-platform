import axios from "axios";
import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.API_BASE_URL || "http://localhost:8080";

export async function POST(req) {
    try {
        // ✅ 브라우저 → Next 로 넘어온 세션 쿠키를 백엔드로 그대로 전달
        const cookie = req.headers.get("cookie") || "";

        const res = await axios.post(
            `${BACKEND_BASE}/api/user/logout`,
            null,
            {
                headers: {
                    "Content-Type": "application/json",
                    ...(cookie ? { Cookie: cookie } : {}),
                },
                withCredentials: true,
                validateStatus: () => true,
            }
        );

        const nextRes = NextResponse.json(res.data, {
            status: res.status,
        });

        // ✅ 로그아웃 시 백엔드가 Set-Cookie(쿠키 만료)를 내려주면 그대로 전달
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
            nextRes.headers.set("set-cookie", setCookie);
        }

        return nextRes;
    } catch (err) {
        return NextResponse.json(
            { message: err?.message || "Auth logout route error" },
            { status: 500 }
        );
    }
}
