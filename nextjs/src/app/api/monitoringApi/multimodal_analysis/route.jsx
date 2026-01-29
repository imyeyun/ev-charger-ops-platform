import axios from "axios";
import { NextResponse } from "next/server";

function getAxiosErrorMessage(err) {
    if (err && err.response && err.response.data) {
        const data = err.response.data;

        if (typeof data === "string" && data.trim()) return data.trim();
        if (data.message !== undefined && data.message !== null && String(data.message).trim())
            return String(data.message).trim();
        if (data.error !== undefined && data.error !== null && String(data.error).trim())
            return String(data.error).trim();

        if (err.response.status !== undefined && err.response.status !== null)
            return "요청 실패 status " + String(err.response.status);
    }

    if (err && err.message && String(err.message).trim()) return String(err.message).trim();

    return "서버 내부 오류가 발생했습니다.";
}

async function readJson(req) {
    try {
        return await req.json();
    } catch (e) {
        return null;
    }
}

function readString(body, key) {
    if (!body) return "";
    if (body[key] === undefined || body[key] === null) return "";
    return String(body[key]).trim();
}

const api = axios.create({
    baseURL: process.env.BACKEND_URL || "http://localhost:8080",
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

const BACKEND_PATH = "/api/multimodal_analysis";

export async function POST(request) {
    const body = await readJson(request);

    const statId = readString(body, "statId");
    const chgerId = readString(body, "chgerId");

    if (!statId) {
        return NextResponse.json({ error: "statId is required" }, { status: 400 });
    }

    if (!chgerId) {
        return NextResponse.json({ error: "chgerId is required" }, { status: 400 });
    }

    try {
        const res = await api.post(BACKEND_PATH, { statid: statid, chgerid: chgerid });
        return NextResponse.json(res.data, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: getAxiosErrorMessage(e) }, { status: 500 });
    }
}
