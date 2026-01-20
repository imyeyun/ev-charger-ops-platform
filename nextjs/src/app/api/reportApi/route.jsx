// app/api/reportApi/route.jsx
import axios from "axios";
import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.API_BASE_URL || "http://localhost:8080";

export async function POST(req) {
    try {
        const payload = await req.json();

        const res = await axios.post(`${BACKEND_BASE}/api/report`, payload, {
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
            validateStatus: () => true, // 4xx/5xx도 그대로 내려주기
        });

        return NextResponse.json(res.data, { status: res.status });

    } catch (err) {
        return NextResponse.json(
            { message: err?.message || "Report route error" },
            { status: 500 }
        );
    }
}
