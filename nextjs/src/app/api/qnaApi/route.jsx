import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null);
        const prompt = (body?.prompt ?? "").toString().trim();

        if (!prompt) {
            return NextResponse.json({ message: "prompt is required" }, { status: 400 });
        }

        const r = await fetch(`${BACKEND_URL}/api/QnA`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
            cache: "no-store",
        });

        const data = await r.json().catch(() => ({}));

        if (!r.ok) {
            const msg = data?.message || data?.error || `Backend error: ${r.status}`;
            return NextResponse.json({ message: msg }, { status: r.status });
        }

        const answer = (data?.answer ?? "").toString();
        return NextResponse.json({ answer }, { status: 200 });
    } catch (e) {
        return NextResponse.json(
            { message: e?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
