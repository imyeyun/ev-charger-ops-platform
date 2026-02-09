import { NextResponse } from "next/server";
import {BACKEND_BASE} from "@/app/api/url";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);

        // 기대 스펙: { statId: [12, 15] }
        const statIdRaw = body?.statId;
        const statId = Array.isArray(statIdRaw) ? statIdRaw : [];

        // 숫자로 바꿀 수 있으면 숫자로
        const payload = {
            statId: statId
        };

        const cookie = request.headers.get("cookie") || "";

        const res = await fetch(`${BACKEND_BASE}/api/external_notification`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(cookie ? { cookie } : {}),
            },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        const text = await res.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = null;
        }

        //백엔드 응답 상태에 따라 Next 응답 생성
        let nextRes;
        if (res.ok) {
            // 성공 응답: JSON이면 그대로, 아니면 { ok: true }로 통일
            nextRes = NextResponse.json(data ?? { ok: true }, { status: 200 });
        } else {
            // 실패 응답: 상태코드 유지 + 디버그용 body 포함
            nextRes = NextResponse.json(
                {
                    error: "BACKEND_ERROR",
                    status: res.status,
                    body: data !== null ? data : text,
                },
                { status: res.status }
            );
        }

        // 백엔드가 Set-Cookie를 내려주면 브라우저로 그대로 전달(세션 유지)
        const setCookie = res.headers.get("set-cookie");
        if (setCookie) {
            nextRes.headers.set("set-cookie", setCookie);
        }

        return nextRes;
    } catch (e) {
        return NextResponse.json(
            { error: String(e?.message || "Internal Server Error") },
            { status: 500 }
        );
    }
}