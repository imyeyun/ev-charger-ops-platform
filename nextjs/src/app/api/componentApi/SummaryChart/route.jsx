import axios from "axios";
import { NextResponse } from "next/server";
import { BACKEND_BASE } from "@/app/api/url";

const api = axios.create({
    baseURL: BACKEND_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
});

export async function GET() {
    try {
        const res = await api.get("/api/condition");
        const conditionRaw = res ? res.data : null;

        const payload = { chargerStat: {"9":0, "1":0, "2":0, "3":0, "4":0, "5":0} };

        if (conditionRaw.data) {
            payload.chargerStat["9"] = Number(conditionRaw.data["9"]) || 0;
            payload.chargerStat["1"] = Number(conditionRaw.data["1"]) || 0;
            payload.chargerStat["2"] = Number(conditionRaw.data["2"]) || 0;
            payload.chargerStat["3"] = Number(conditionRaw.data["3"]) || 0;
            payload.chargerStat["4"] = Number(conditionRaw.data["4"]) || 0;
            payload.chargerStat["5"] = Number(conditionRaw.data["5"]) || 0;

        }

        return NextResponse.json(payload, { status: 200 });
    } catch (e) {
        // return NextResponse.json({ error: getAxiosErrorMessage(e) }, { status: 500 });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
