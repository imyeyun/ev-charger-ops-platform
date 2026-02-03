import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

export async function GET(request) {
    try {
        const { searchParams} = new URL(request.url);
        const statId = searchParams.get("statId");

        if (!statId) {
            return NextResponse.json({ error: "statId is required" }, { status: 400 });
        }

        const res = await api.get(`/api/charging-stations/${statId}/image`, {
            validateStatus: (status) => true,
        });

        return NextResponse.json(res.data, { status: res.status });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
