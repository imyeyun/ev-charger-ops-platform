import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE} from "@/app/api/url";


const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
});

function assertSuccess(response) {
    const payload = response.data;
    if (!payload) throw new Error("Empty response");

    if (payload.code && payload.code !== 200) {
        const err = new Error(payload.message || "요청 처리 중 오류가 발생했습니다.");
        err.code = payload.code;
        err.payload = payload;
        throw err;
    }

    return payload;
}

export async function POST(request) {
    try {
        const body = await request.json();

        const prompt = String(body.prompt || "").trim();
        if (prompt.length === 0) {
            return NextResponse.json({ error: "prompt is required" }, { status: 400 });
        }

        // threadId는 없으면 0으로 처리 (간단 구현)
        const threadId = Number(body.threadId || 0);

        // 백엔드로 프록시
        const res = await api.post("/api/QnA", {
            prompt: prompt,
            threadId: threadId,
        });

        const payload = assertSuccess(res);

        if (payload.answer !== undefined && payload.answer !== null) {
            return NextResponse.json(
                { answer: String(payload.answer), threadId: threadId },
                { status: 200 }
            );
        }

        if (payload.data && payload.data.answer !== undefined && payload.data.answer !== null) {
            return NextResponse.json(
                { answer: String(payload.data.answer), threadId: threadId },
                { status: 200 }
            );
        }

        return NextResponse.json({ answer: answer, threadId: threadId }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: String(error.message || "요청 처리 중 오류가 발생했습니다.") },
            { status: 500 }
        );
    }
}