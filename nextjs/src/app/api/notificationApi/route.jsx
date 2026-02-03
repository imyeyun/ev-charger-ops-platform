import { NextResponse } from "next/server";
import {BACKEND_BASE} from "@/app/api/url";

function toNumberIfPossible(v) {
    const s = String(v ?? "").trim();
    if (!s) return s;
    const n = Number(s);
    return Number.isFinite(n) && String(n) === s ? n : s;
}

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);

        // 기대 스펙: { statId: [12, 15] }
        const statIdRaw = body?.statId;
        const statId = Array.isArray(statIdRaw) ? statIdRaw : [];

        // 숫자로 바꿀 수 있으면 숫자로
        const payload = {
            statId: statId.map(toNumberIfPossible),
        };

        const res = await fetch(`${BACKEND_BASE}/api/external_notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const msg =
                (data && (data.error || data.message)) ||
                "Internal Server Error";
            return NextResponse.json({ error: String(msg) }, { status: res.status });
        }

        return NextResponse.json(data ?? { ok: true }, { status: 200 });
    } catch (e) {
        return NextResponse.json(
            { error: String(e?.message || "Internal Server Error") },
            { status: 500 }
        );
    }
}