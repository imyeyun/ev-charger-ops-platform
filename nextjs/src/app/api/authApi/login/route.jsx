import axios from "axios";
import { NextResponse } from "next/server";

const BACKEND_BASE =
    process.env.API_BASE_URL || "http://localhost:8080";

// 프론트 전용 임시 계정
const TEMP_LOGIN = {
    employeeNum: "admin",
    password: "1234",
};

export async function POST(req) {
    try {
        const { employeeNum, password } = await req.json();

        // ✅ 임시 계정은 백엔드 없이 성공 처리
        if (
            employeeNum === TEMP_LOGIN.employeeNum &&
            password === TEMP_LOGIN.password
        ) {
            return NextResponse.json({ code: 200 }, { status: 200 });
        }

        const res = await axios.post(
            `${BACKEND_BASE}/api/user/login`,
            { employeeNum, password },
            {
                headers: { "Content-Type": "application/json" },
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
