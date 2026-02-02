import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";
import axios from "axios";

export async function GET() {
    const backendUrl = `${BACKEND_BASE}/api/search`;

    try {
        const res = await axios.get(backendUrl, {
            timeout: 15000,
            validateStatus: () => true, // 백엔드 4xx/5xx 그대로 전달
        });

        return NextResponse.json(res.data ?? null, { status: res.status });
    } catch (err) {
        return NextResponse.json(
            { error: "Failed to reach backend", detail: String(err?.message || err) },
            { status: 502 }
        );
    }
}
