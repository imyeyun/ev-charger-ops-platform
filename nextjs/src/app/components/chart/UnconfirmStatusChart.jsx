"use client";

import { useState, useEffect, useMemo } from "react";

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

        // ✅ hover/tooltip 위치
        const mid = (a0 + a1) / 2;
        const tipR = r * 0.72;
        const tipX = cx + Math.cos(mid) * tipR;
        const tipY = cy + Math.sin(mid) * tipR;

        out.push({
            key: seg.key,
            d,
            title: seg.title,
            tipX,
            tipY,
        });

        acc += frac;
    }

    return out;
}

function colorOfKey(key) {
    // 상태별 고정 색(원하면 바꿔도 됨)
    if (key === "9") return "#9ba1a6"; // 노랑
    if (key === "1") return "#F59E0B"; // 파랑
    if (key === "4") return "#DC2626"; // 주황
    if (key === "5") return "#B91C1C"; // 빨강
    return "#999";
}

// 라벨링
function labelOfKey(key) {
    if (key === "9") return "알수없음";
    if (key === "1") return "통신이상";
    if (key === "4") return "운영중지";
    if (key === "5") return "점검중";
    return String(key);
}

function toNum(v) {
    if (v === undefined || v === null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
}

export default function ChartUnconfirmedStatus() {
    const [chargerStat, setChargerStat] = useState({ "9": 0, "1": 0, "4": 0, "5": 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ✅ hover(툴팁/레전드 연동)
    const [hoverKey, setHoverKey] = useState(null);
    const [tooltip, setTooltip] = useState(null); // { x, y, label, value, pct }

    const v9 = toNum(chargerStat["9"]);
    const v1 = toNum(chargerStat["1"]);
    const v4 = toNum(chargerStat["4"]);
    const v5 = toNum(chargerStat["5"]);

    const total = v9 + v1 + v4 + v5;

    const segments = useMemo(() => {
        return [
            { key: "9", value: v9, total: total, title: labelOfKey("9") + " " + String(v9) },
            { key: "1", value: v1, total: total, title: labelOfKey("1") + " " + String(v1) },
            { key: "4", value: v4, total: total, title: labelOfKey("4") + " " + String(v4) },
            { key: "5", value: v5, total: total, title: labelOfKey("5") + " " + String(v5) },
        ];
    }, [v9, v1, v4, v5, total]);

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
    const cx = w / 2;
    const cy = h / 2;
    const r = 100;

    const paths = buildPiePaths(cx, cy, r, segments);

    return (
        <div style={{ width: "100%", height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                }}
            >
                <svg
                    viewBox={`0 0 ${w} ${h}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                        display: "block",
                        width: "100%",
                        maxWidth: w,
                        height: "auto",
                        margin: "0 auto",
                    }}
                    onMouseLeave={() => {
                        setHoverKey(null);
                        setTooltip(null);
                    }}
                >
                    {paths.map(function (p) {
                        const color = colorOfKey(p.key);
                        const isHover = hoverKey === p.key;

                        // pct는 실제 비율로
                        const seg = segments.find((s) => s.key === p.key);
                        const value = seg ? toNum(seg.value) : 0;
                        const pct = total > 0 ? Math.round((value * 1000) / total) / 10 : 0;

                        return (
                            <path
                                key={p.key}
                                d={p.d}
                                fill={color}
                                style={{
                                    cursor: "pointer",
                                    transition: "filter 120ms ease, opacity 120ms ease",
                                    filter: isHover ? "drop-shadow(0px 2px 6px rgba(0,0,0,0.18))" : "none",
                                    opacity: hoverKey && !isHover ? 0.65 : 1,
                                }}
                                onMouseEnter={() => {
                                    setHoverKey(p.key);
                                    setTooltip({
                                        x: p.tipX,
                                        y: p.tipY,
                                        label: labelOfKey(p.key),
                                        value: value,
                                        pct: pct,
                                    });
                                }}
                            >
                                <title>{p.title}</title>
                            </path>
                        );
                    })}

                    {/* ✅ SVG 툴팁 */}
                    {tooltip && (
                        <g pointerEvents="none">
                            {(() => {
                                const boxW = 160;
                                const boxH = 34;

                                let x = tooltip.x - boxW / 2;
                                let y = tooltip.y - boxH - 8;

                                if (x < 6) x = 6;
                                if (x + boxW > w - 6) x = w - boxW - 6;
                                if (y < 6) y = tooltip.y + 10;

                                return (
                                    <>
                                        <rect x={x} y={y} width={boxW} height={boxH} rx={10} fill="rgba(17,17,17,0.88)" />
                                        <text
                                            x={x + boxW / 2}
                                            y={y + 14}
                                            textAnchor="middle"
                                            style={{ fontSize: 11, fill: "#fff", fontWeight: 800 }}
                                        >
                                            {tooltip.label}
                                        </text>
                                        <text
                                            x={x + boxW / 2}
                                            y={y + 27}
                                            textAnchor="middle"
                                            style={{ fontSize: 10, fill: "rgba(255,255,255,0.9)" }}
                                        >
                                            {tooltip.value}건 · {tooltip.pct}%
                                        </text>
                                    </>
                                );
                            })()}
                        </g>
                    )}

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
                        width: "100%",
                        padding: "0 8px",
                        boxSizing: "border-box",
                    }}
                >
                    <div style={{ maxWidth: 260, margin: "0 auto" }}>
                        {segments.map(function (s) {
                            const cnt = toNum(s.value);
                            const pct = Math.round((cnt * 100) / (total > 0 ? total : 1));
                            const color = colorOfKey(s.key);
                            const isHover = hoverKey === s.key;

                            return (
                                <div
                                    key={s.key}
                                    onMouseEnter={() => setHoverKey(s.key)}
                                    onMouseLeave={() => setHoverKey(null)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        marginBottom: 1,
                                        width: "100%",
                                        padding: "4px 6px",
                                        borderRadius: 10,
                                        background: isHover ? "rgba(0,0,0,0.04)" : "transparent",
                                        cursor: "default",
                                    }}
                                >
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flex: "0 0 auto" }} />
                                    <div style={{ flex: "1 1 auto", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {labelOfKey(s.key)} <span style={{ color: "#999" }}>({cnt})</span>
                                    </div>
                                    <div style={{ flex: "0 0 auto", width: 36, textAlign: "right", color: "#555" }}>
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