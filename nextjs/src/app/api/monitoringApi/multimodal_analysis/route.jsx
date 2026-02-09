import axios from "axios";
import { NextResponse } from "next/server";
import {BACKEND_BASE} from "@/app/api/url";

function getAxiosErrorMessage(err) {
    if (err && err.response && err.response.data) {
        const data = err.response.data;
        if (typeof data === "string" && data.trim()) return data.trim();
        if (data.message !== undefined && data.message !== null && String(data.message).trim())
            return String(data.message).trim();
        if (data.error !== undefined && data.error !== null && String(data.error).trim())
            return String(data.error).trim();
    }
    if (err && err.message && String(err.message).trim()) return String(err.message).trim();
    return "서버 내부 오류가 발생했습니다.";
}

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

export async function POST(request) {
    const body = await request.json();

    let statId = "";
    if (body && body.statId !== undefined && body.statId !== null) {
        statId = String(body.statId).trim();
    }

    let chgerId = "";
    if (body && body.chgerId !== undefined && body.chgerId !== null) {
        chgerId = String(body.chgerId).trim();
    }

    if (!statId) {
        return NextResponse.json({ error: "statId is required" }, { status: 400 });
    }

    if (!chgerId) {
        return NextResponse.json({ error: "chgerId is required" }, { status: 400 });
    }

    try {
        const cookie = request.headers.get("cookie") || "";

        const res = await api.post(
            "/api/multimodal_analysis",
            { statId, chgerId },
            { headers: cookie ? { cookie } : {} }
        );
        // ✅ 핵심: 백엔드가 세션 갱신(Set-Cookie)하면 브라우저로 그대로 전달
        const nextRes = NextResponse.json(res.data, { status: 200 });
        const setCookie = res.headers && res.headers["set-cookie"];
        if (setCookie) {
            // 여러 개 쿠키도 그대로 전달
            nextRes.headers.set("set-cookie", Array.isArray(setCookie) ? setCookie.join(", ") : String(setCookie));
        }

        return nextRes;
    } catch (e) {
        const status = e && e.response && e.response.status ? e.response.status : 500;
        return NextResponse.json({ error: getAxiosErrorMessage(e) }, { status });
    }
}
