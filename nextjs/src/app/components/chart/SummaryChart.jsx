"use client";

import { useEffect, useMemo, useState } from "react";

const COLOR_MAP = {
    communicationError: "#F59E0B", // 통신이상 - amber (경고)
    chargingReady:      "#2563EB", // 충전대기 - blue (정상)
    charging:           "#16A34A", // 충전중 - green (정상)
    outOfService:       "#DC2626", // 운영중지 - red (치명)
    maintenance:        "#B91C1C", // 점검중 - dark red (치명/지속)
    unknown:            "#9ba1a6", // 상태미확인 - gray
};

function colorOfKey(key) {
    return COLOR_MAP[key] || "#D0D0D0";
}

/** ✅ 희귀/중요 상태만 “표시용 가중치” */
function weightOfKey(key) {
    if (key === "unknown") return 2.0;            // 9
    if (key === "outOfService") return 9.0;       // 4
    if (key === "maintenance") return 7.0;        // 5
    if (key === "communicationError") return 2.0; // 1
    return 1.0;                                   // 2,3
}

function toNum(v) {
    if (v === undefined || v === null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
}

function getCount(stat, key) {
    if (!stat) return 0;
    return toNum(stat[key]);
}

function polar(cx, cy, r, a) {
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function buildRingSegmentPath(cx, cy, rOuter, rInner, a0, a1) {
    const p0 = polar(cx, cy, rOuter, a0);
    const p1 = polar(cx, cy, rOuter, a1);
    const q1 = polar(cx, cy, rInner, a1);
    const q0 = polar(cx, cy, rInner, a0);

    const delta = a1 - a0;
    const largeArc = delta > Math.PI ? 1 : 0;

    return (
        "M " + p0.x + " " + p0.y +
        " A " + rOuter + " " + rOuter + " 0 " + largeArc + " 1 " + p1.x + " " + p1.y +
        " L " + q1.x + " " + q1.y +
        " A " + rInner + " " + rInner + " 0 " + largeArc + " 0 " + q0.x + " " + q0.y +
        " Z"
    );
}

export default function ChartChargerStatusSummary(props) {
    const [chargerStat, setChargerStat] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /** ✅ hover(확대/툴팁/레전드 연동) */
    const [hoverKey, setHoverKey] = useState(null);
    const [tooltip, setTooltip] = useState(null); // { x, y, label, value, pct }

    useEffect(() => {
        let alive = true;

        async function run() {
            setLoading(true);
            setError("");

            try {
                const res = await fetch("/api/componentApi/SummaryChart", {
                    method: "GET",
                    cache: "no-store",
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    const msg = (data && (data.error || data.message)) || "데이터를 불러오지 못했습니다.";
                    throw new Error(String(msg));
                }

                const stat = data && data.chargerStat ? data.chargerStat : null;
                if (alive) setChargerStat(stat);
            } catch (e) {
                if (alive) {
                    const msg = e && e.message ? String(e.message) : "데이터를 불러오지 못했습니다.";
                    setError(msg);
                    setChargerStat(null);
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

    const grouped = useMemo(() => {
        const communicationError = getCount(chargerStat, "1"); // 통신이상
        const chargingReady      = getCount(chargerStat, "2"); // 충전대기
        const charging           = getCount(chargerStat, "3"); // 충전중
        const outOfService       = getCount(chargerStat, "4"); // 운영중지
        const maintenance        = getCount(chargerStat, "5"); // 점검중
        const unknown            = getCount(chargerStat, "9"); // 상태미확인

        const total =
            communicationError +
            chargingReady +
            charging +
            outOfService +
            maintenance +
            unknown;

        return {
            communicationError,
            chargingReady,
            charging,
            outOfService,
            maintenance,
            unknown,
            total,
        };
    }, [chargerStat]);

    const segments = useMemo(
        () => [
            { key: "communicationError", code: "1", label: "통신이상",   value: grouped.communicationError },
            { key: "chargingReady",      code: "2", label: "충전대기",   value: grouped.chargingReady },
            { key: "charging",           code: "3", label: "충전중",     value: grouped.charging },
            { key: "outOfService",       code: "4", label: "운영중지",   value: grouped.outOfService },
            { key: "maintenance",        code: "5", label: "점검중",     value: grouped.maintenance },
            { key: "unknown",            code: "9", label: "알수없음", value: grouped.unknown },
        ],
        [grouped]
    );

    if (loading) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", fontSize: 12, color: "#999" }}>불러오는 중...</div>
            </div>
        );
    }
    if (error) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", fontSize: 12, color: "crimson" }}>{error}</div>
            </div>
        );
    }
    if (!chargerStat || grouped.total <= 0) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", fontSize: 12, color: "#999" }}>데이터 없음</div>
            </div>
        );
    }

    // SVG 설정 (상단 반 도넛)
    const w = 320;
    const h = 200;

    const cx = 160;
    const cy = 160;

    const rOuter = 140;
    const rInner = 80;

    const startBase = Math.PI;
    const endBase = Math.PI * 2;
    const span = endBase - startBase;

    // ✅ 표시용(가중치 적용) 비율 계산 (각도는 이걸로, 퍼센트는 실제값으로)
    const rawFracs = segments.map((s) => (grouped.total > 0 ? s.value / grouped.total : 0));
    const weightedFracs = segments.map((s, i) => rawFracs[i] * weightOfKey(s.key));
    const weightedSum = weightedFracs.reduce((a, b) => a + b, 0);
    const displayFracs = weightedSum > 0 ? weightedFracs.map((f) => f / weightedSum) : weightedFracs;

    let acc = 0;
    const paths = [];

    for (let i = 0; i < segments.length; i += 1) {
        const s = segments[i];

        const frac = displayFracs[i] || 0; // ✅ 표시 각도(가중치 반영)
        const a0 = startBase + acc * span;
        const a1 = startBase + (acc + frac) * span;

        const mid = (a0 + a1) / 2;

        if (s.value > 0) {
            const isHover = hoverKey === s.key;

            // ✅ hover 시 "튀어나온" 느낌: outer만 키움
            const outer = isHover ? rOuter + 10 : rOuter;
            const inner = rInner;

            const d = buildRingSegmentPath(cx, cy, outer, inner, a0, a1);

            // ✅ 툴팁 위치(조각 중앙 방향)
            const tipR = (inner + outer) / 2;
            const tipX = cx + Math.cos(mid) * tipR;
            const tipY = cy + Math.sin(mid) * tipR;

            // ✅ 퍼센트는 "진짜 비율"로 표시
            const pct = grouped.total > 0 ? Math.round((s.value * 1000) / grouped.total) / 10 : 0;

            paths.push({
                key: s.key,
                d,
                label: s.label,
                value: s.value,
                pct,
                tipX,
                tipY,
                idx: i,
            });
        }

        acc += frac;
    }

    return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    alignItems: "center",
                    width: "100%",
                    maxWidth: 360,
                    boxSizing: "border-box",
                    overflow: "hidden",
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
                    {/* 바탕 링 */}
                    <path d={buildRingSegmentPath(cx, cy, rOuter, rInner, startBase, endBase)} fill="#eee" />

                    {/* 조각 */}
                    {paths.map((p) => {
                        const color = colorOfKey(p.key);
                        const isHover = hoverKey === p.key;

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
                                        label: p.label,
                                        value: p.value,
                                        pct: p.pct,
                                    });
                                }}
                                onMouseLeave={() => {
                                    setHoverKey(null);
                                    setTooltip(null);
                                }}
                            />
                        );
                    })}

                    {/* ✅ SVG 툴팁 */}
                    {tooltip && (
                        <g pointerEvents="none">
                            {(() => {
                                const boxW = 140;
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

                    {/* 중앙 텍스트 */}
                    <text x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 20, fontWeight: 800, fill: "#111" }}>
                        {grouped.total}
                    </text>
                    <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 11, fill: "#999" }}>
                        전체
                    </text>
                </svg>

                {/* Legend */}
                <div style={{ fontSize: 12, color: "#333", width: "100%", padding: "0 12px", boxSizing: "border-box" }}>
                    <div style={{ maxWidth: 260, margin: "0 auto" }}>
                        {segments.map((s) => {
                            const cnt = s.value;
                            const pct = grouped.total > 0 ? Math.round((cnt * 100) / grouped.total) : 0;
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
                                        gap: 6,
                                        marginBottom: 2,
                                        width: "100%",
                                        padding: "4px 6px",
                                        borderRadius: 10,
                                        background: isHover ? "rgba(0,0,0,0.04)" : "transparent",
                                        cursor: "default",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 4,
                                            background: color,
                                            flex: "0 0 auto",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                                        }}
                                    />

                                    <div
                                        style={{
                                            flex: "1 1 auto",
                                            minWidth: 0,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                        title={`${s.label} ${cnt}건`}
                                    >
                                        {s.label} <span style={{ color: "#999" }}>({cnt})</span>
                                    </div>

                                    <div style={{ marginLeft: 6, flex: "0 0 auto", textAlign: "right", color: "#555" }}>
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