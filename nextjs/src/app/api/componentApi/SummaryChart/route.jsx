import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

export async function GET() {
    try {
        const res = await api.get("/api/condition");
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
