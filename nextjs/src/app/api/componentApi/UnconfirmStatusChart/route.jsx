import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

// function getAxiosErrorMessage(err) {
//     if (err && err.response && err.response.data) {
//         const data = err.response.data;
//
//         if (typeof data === "string") {
//             if (data.trim()) return data.trim();
//         }
//
//         if (data && data.error !== undefined && data.error !== null) {
//             const s = String(data.error).trim();
//             if (s) return s;
//         }
//
//         if (data && data.message !== undefined && data.message !== null) {
//             const s = String(data.message).trim();
//             if (s) return s;
//         }
//
//         if (err.response.status !== undefined && err.response.status !== null) {
//             return "요청 실패 status " + String(err.response.status);
//         }
//     }
//
//     if (err && err.message) {
//         const s = String(err.message).trim();
//         if (s) return s;
//     }
//
//     return "Internal Server Error";
// }

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

export async function GET() {
    try {
        const res = await api.get("/api/uncheck");
        const conditionRaw = res ? res.data : null;

        const payload = { chargerStat: null };

        if (conditionRaw) {
            if (conditionRaw.chargerStat !== undefined && conditionRaw.chargerStat !== null) {
                payload.chargerStat = conditionRaw.chargerStat;
            }
        }

        return NextResponse.json(payload, { status: 200 });
    } catch (e) {
        // return NextResponse.json({ error: getAxiosErrorMessage(e) }, { status: 500 });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
