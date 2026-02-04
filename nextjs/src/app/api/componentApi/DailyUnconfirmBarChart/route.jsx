import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

export async function GET() {
    try {
        const res = await api.get("/api/uncheckDaily");
        const raw = res ? res.data : null;

        let list = [];
        if (raw && raw.data && raw.data.dailychargerStatBadCase !== undefined && raw.data.dailychargerStatBadCase !== null) {
            list = raw.data.dailychargerStatBadCase;
        }

        const payload = {
            dailychargerStatBadCase: list,
        };

        return NextResponse.json(payload, {status: 200});
    } catch (e) {
        return NextResponse.json({error: "Internal Server Error"}, {status: 500});
    }
}
