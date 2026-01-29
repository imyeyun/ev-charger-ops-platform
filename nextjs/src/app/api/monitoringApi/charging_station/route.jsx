import axios from "axios";
import { NextResponse } from "next/server";

const api = axios.create({
    baseURL: process.env.BACKEND_URL || "http://localhost:8080",
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
    withCredentials: false,
});


function readNumber(body, key, defaultValue) {
    if (body[key] === null) return defaultValue;
    return Number(body[key]);
}

function getErrorMessage(error) {
    if (error && error.message) return String(error.message);
    return "Internal Server Error";
}

const BACKEND_PATH = "/api/charging_station/detail";

export async function POST(request) {
    try {
        const body = await request.json();
        const statId = readNumber(body, "statId", 0);

        const payload = {
            statId: statId,
        };

        const res = await api.post(BACKEND_PATH, payload);

        return NextResponse.json(res.data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
