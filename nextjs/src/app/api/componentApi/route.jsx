import axios from "axios";
import { NextResponse } from "next/server";

function getAxiosErrorMessage(err) {
    if (err && err.response && err.response.data) {
        const data = err.response.data;

        if (typeof data === "string") {
            if (data.trim()) return data.trim();
        }

        if (data && data.error !== undefined && data.error !== null) {
            const s = String(data.error).trim();
            if (s) return s;
        }

        if (data && data.message !== undefined && data.message !== null) {
            const s = String(data.message).trim();
            if (s) return s;
        }

        if (err.response.status !== undefined && err.response.status !== null) {
            return "요청 실패 status " + String(err.response.status);
        }
    }

    if (err && err.message) {
        const s = String(err.message).trim();
        if (s) return s;
    }

    return "Internal Server Error";
}

const api = axios.create({
    baseURL: process.env.BACKEND_URL || "http://localhost:8080",
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
    withCredentials: false,
});


export async function GET() {
    try {
        const res = await api.get("/api/monitoring");
        return NextResponse.json(res.data, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: getAxiosErrorMessage(e) }, { status: 500 });
    }
}