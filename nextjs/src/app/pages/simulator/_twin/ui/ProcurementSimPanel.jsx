"use client";

import { useMemo, useState } from "react";
import { AI_BACKEND_BASE } from "@/app/api/url";

const API = AI_BACKEND_BASE;

export default function ProcurementSimPanel({ onRecommendResult }) {
    const [useLLM, setUseLLM] = useState(true);
    const [nIncidents, setNIncidents] = useState(60);

    const [providers] = useState([
        { name: "A사", baseLat: 37.5665, baseLon: 126.978, remoteRecoveryRate: 0.35 },
        { name: "B사", baseLat: 37.55, baseLon: 126.99, remoteRecoveryRate: 0.25 },
        { name: "C사", baseLat: 37.58, baseLon: 126.96, remoteRecoveryRate: 0.45 },
        { name: "D사", baseLat: 37.58, baseLon: 126.97, remoteRecoveryRate: 0.45 }
    ]);

    const canRun = useMemo(() => providers?.length > 0, [providers]);

    const runRecommend = async () => {
        if (!canRun) return;

        try {
            const res = await fetch(`${API}/agent/procurement/recommend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    useLLM,
                    nIncidents: Number(nIncidents),
                    providers,
                    trafficModes: ["free", "normal", "congested"],
                    weights: { w_sla: 0.55, w_p90: 0.25, w_remote: 0.2 },
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail ?? JSON.stringify(data));

            onRecommendResult?.({
                params: {
                    useLLM,
                    nIncidents: Number(nIncidents),
                    providersCount: providers.length,
                },
                result: data,
            });
        } catch (e) {
            console.error(e);
            alert("선정 에이전트 실행 실패 (백엔드/요청 확인)");
        }
    };

    return (
        <div
            style={{
                // ✅ position:absolute 제거 (제자리 박힘)
                width: "100%",
                background: "white",
                border: "1px solid #e6e8ee",
                borderRadius: 14,
                padding: 12,
            }}
        >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>유지보수 수행사 선정</div>

            <div style={{ display: "grid", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={useLLM} onChange={(e) => setUseLLM(e.target.checked)} />
                    LLM 설명 포함
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 13, color: "#555" }}>장애 발생 건수</div>
                    <input
                        value={nIncidents}
                        onChange={(e) => setNIncidents(e.target.value)}
                        style={{
                            height: 34,
                            borderRadius: 10,
                            border: "1px solid #e6e8ee",
                            padding: "0 10px",
                            outline: "none",
                        }}
                    />
                </div>

                <div style={{ fontSize: 12, color: "#64748b" }}>
                    • 업체 수: <b>{providers.length}</b>개 <br />
                    • 결과는 오른쪽 <b>“요약”</b> 탭의 “유지보수 수행사 선정 결과”에 표시
                </div>

                <button
                    onClick={runRecommend}
                    disabled={!canRun}
                    style={{
                        height: 40,
                        borderRadius: 12,
                        border: 0,
                        background: canRun ? "#1f2430" : "#9aa3b2",
                        color: "white",
                        fontWeight: 900,
                        cursor: canRun ? "pointer" : "not-allowed",
                    }}
                >
                    선정 에이전트 실행
                </button>
            </div>
        </div>
    );
}
