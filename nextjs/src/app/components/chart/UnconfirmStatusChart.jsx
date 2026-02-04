"use client";

import { useMemo, useState, useEffect } from "react";

function buildPiePaths(cx, cy, r, segments) {
    const full = Math.PI * 2;
    let acc = 0;

    const out = [];

    for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i];

        let frac = 0;
        if (seg.total > 0) {
            frac = seg.value / seg.total;
        }

        const a0 = acc * full - Math.PI / 2;
        const a1 = (acc + frac) * full - Math.PI / 2;

        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);

        const large = frac > 0.5 ? 1 : 0;

        const d =
            "M " + cx + " " + cy +
            " L " + x0 + " " + y0 +
            " A " + r + " " + r +
            " 0 " + large +
            " 1 " + x1 + " " + y1 +
            " Z";

        out.push({
            key: seg.key,
            d: d,
            title: seg.title,
        });

        acc += frac;
    }

    return out;
}


function colorOfKey(key) {
    // 상태별 고정 색(원하면 바꿔도 됨)
    if (key === "9") return "#F5C542"; // 노랑
    if (key === "1") return "#2F6BFF";    // 파랑
    if (key === "2") return "#E67E22";    // 주황
    if (key === "4") return "#E53935";    // 빨강
    return "#999";
}

// 라벨링
function labelOfKey(key) {
    if (key === "9") return "알 수 없음";
    if (key === "1") return "통신 이상";
    if (key === "2") return "운영 중지";
    if (key === "4") return "점검 중";
    return String(key);
}


export default function ChartUnconfirmedStatus() {
    const [chargerStat, setChargerStat] = useState({ "9": 0, "1": 0, "4": 0, "5": 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const v9 = chargerStat["9"];
    const v1 = chargerStat["1"];
    const v4 = chargerStat["4"];
    const v5 = chargerStat["5"];

    const total = v9 + v1 + v4 + v5;

    const segments = [
        { key: "9", value: v9, total: total, title: labelOfKey("9") + " " + String(v9) },
        { key: "1", value: v1, total: total, title: labelOfKey("1") + " " + String(v1) },
        { key: "4", value: v4, total: total, title: labelOfKey("4") + " " + String(v4) },
        { key: "5", value: v5, total: total, title: labelOfKey("5") + " " + String(v5) },
    ];

    useEffect(() => {
        let alive = true;

        async function run() {
            setLoading(true);
            setError("");

            try {
                const res = await fetch("/api/componentApi/UnconfirmStatusChart", {
                    method: "GET",
                    cache: "no-store",
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    let msg = "데이터를 불러오지 못했습니다.";
                    if (data && data.error) msg = String(data.error);
                    if (data && data.message) msg = String(data.message);
                    throw new Error(msg);
                }
                let next = { "9": 0, "1": 0, "4": 0, "5": 0 };
                if (data && data.chargerStat) next = data.chargerStat;

                if (alive) setChargerStat(next);
            } catch (e) {
                if (alive) {
                    setError(String((e && e.message) || "데이터를 불러오지 못했습니다."));
                    setChargerStat({ "9": 0, "1": 0, "4": 0, "5": 0 });
                }
            } finally {
                if (alive) setLoading(false);
            }
        }

        run();
        return () => {
            alive = false;
        };
    }, []);


    if (loading) {
        return (
            <div style={{ width: "100%", height: 240, background: "#f2f2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
                불러오는 중...
            </div>
        );
    }
    if (error) {
        return (
            <div style={{ width: "100%", height: 240, background: "#f2f2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "crimson", fontSize: 12, padding: 12, textAlign: "center" }}>
                {error}
            </div>
        );
    }
    if (total <= 0) {
        return (
            <div style={{ width: "100%", height: 240, background: "#f2f2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
                데이터 없음
            </div>
        );
    }

    const w = 320;
    const h = 240;
    const cx = w/2;
    const cy = h/2;
    const r = 100;

    const paths = buildPiePaths(cx, cy, r, segments);

    return (
        <div style={{ width: "100%", height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",   // ✅ [수정]
                    gap: 8,                    // ✅ [수정] 간격 축소
                    alignItems: "center",
                    width: "100%",             // ✅ [수정]
                    maxWidth: "100%",          // ✅ [수정]
                    boxSizing: "border-box",   // ✅ [수정]
                }}
            >
                {/* ✅ [수정] 고정 width/height SVG 제거 → viewBox 기반 반응형 */}
                <svg
                    viewBox={`0 0 ${w} ${h}`}                 // ✅ [수정]
                    preserveAspectRatio="xMidYMid meet"       // ✅ [수정]
                    style={{
                        display: "block",
                        width: "100%",                        // ✅ [수정]
                        maxWidth: w,                          // ✅ [수정] 원래 크기 이상 커지지 않게
                        height: "auto",                       // ✅ [수정]
                        margin: "0 auto",
                    }}
                >
                    {paths.map(function (p) {
                        const color = colorOfKey(p.key);
                        return (
                            <path key={p.key} d={p.d} fill={color}>
                                <title>{p.title}</title>
                            </path>
                        );
                    })}
                    <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 18, fontWeight: 800, fill: "#111" }}
                    >
                        {/*{total}*/}
                    </text>
                </svg>
                <div
                    style={{
                        fontSize: 12,
                        color: "#333",
                        width: "100%",               // ✅ [수정]
                        padding: "0 8px",            // ✅ [수정]
                        boxSizing: "border-box",     // ✅ [수정]
                    }}
                >
                    <div style={{ maxWidth: 260, margin: "0 auto" }}> {/* ✅ [수정] 너무 넓어지지 않게 */}

                        {segments.map(function (s) {
                            const cnt = s.value;
                            const pct = Math.round((cnt * 100) / (total > 0 ? total : 1));
                            const color = colorOfKey(s.key);

                            return (
                                <div
                                    key={s.key}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,          // ✅ [수정] 라벨/값 사이 간격 더 좁게
                                        marginBottom: 1, // ✅ [수정] 행 간격 더 좁게
                                        width: "100%",
                                    }}
                                >
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flex: "0 0 auto" }} />
                                    <div style={{ flex: "1 1 auto", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {labelOfKey(s.key)} <span style={{ color: "#999" }}>({cnt})</span>
                                    </div>
                                    <div style={{ flex: "0 0 auto", width: 36, textAlign: "right", color: "#555" }}> {/* ✅ [수정] 폭 축소 */}
                                        {pct}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}