import axios from "axios";
import { NextResponse } from "next/server";

const BACKEND_BASE =
    process.env.API_BASE_URL || "http://localhost:8080";

export async function POST(req) {
    try {
        const body = await req.json();

        const res = await axios.post(
            `${BACKEND_BASE}/api/user/signup`,
            body,
            {
                headers: { "Content-Type": "application/json" },
                validateStatus: () => true,
            }
        );

        return NextResponse.json(res.data, {
            status: res.status,
        });
    } catch (err) {
        return NextResponse.json(
            { message: err?.message || "Auth signup route error" },
            { status: 500 }
        );
    }
}
