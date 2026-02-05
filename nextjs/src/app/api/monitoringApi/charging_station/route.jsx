import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
    withCredentials: false,
});


function readText(body, key, defaultValue) {
    const v = body ? body[key] : null;
    if (v === undefined || v === null) return defaultValue;
    return String(v);
}

function getErrorMessage(error) {
    if (error && error.message) return String(error.message);
    return "Internal Server Error";
}

const BACKEND_PATH = "/api/charging_station/detail";

export async function POST(request) {
    try {
        const body = await request.json();
        // const statId = readNumber(body, "statId", 0);
        //
        // const payload = {
        //     statId: statId,
        // };

        // const res = await api.post(BACKEND_PATH, payload);
        const statId = readText(body, "statId", "");
        if (!statId) {
            return NextResponse.json({ error: "statId is required" }, { status: 400 });
        }


        const res = await api.post(BACKEND_PATH, { statId });

        return NextResponse.json(res.data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
