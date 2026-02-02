import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

function toPlainObject(v) {
    if (!v) return {};
    if (Array.isArray(v)) return {};
    if (typeof v !== "object") return {};
    return v;
}

export async function GET() {
    try {
        const res = await api.get("/api/uncheckRg");
        const raw = res ? res.data : null;

        const payload = { chargingStation: {} };

        if (raw) {
            payload.chargingStation = toPlainObject(raw.chargingStation);
        }

        return NextResponse.json(payload, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
