import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

export async function POST(req) {
    try {
        const { employeeNum, password } = await req.json();
        
        const url = `${BACKEND_BASE}/api/user/login`;
        console.log("[authApi/login] backend url =", url);

        const res = await axios.post(
            `${BACKEND_BASE}/api/user/login`,
            { employeeNum, password },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 5000,   
                withCredentials: true,
                validateStatus: () => true, // ❗ axios가 4xx/5xx에서 throw 안 하게
            }
        );

        const nextRes = NextResponse.json(res.data, {
            status: res.status,
        });

        // ✅ 백엔드에서 Set-Cookie 내려주면 그대로 전달
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
            nextRes.headers.set("set-cookie", setCookie);
        }

        return nextRes;
    } catch (err) {
        return NextResponse.json(
            { message: err?.message || "Auth login route error" },
            { status: 500 }
        );
    }
}
