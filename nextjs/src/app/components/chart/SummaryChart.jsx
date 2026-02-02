"use client";

import { useEffect, useMemo, useState } from "react";

function toNum(v) {
    if (v === undefined) return 0;
    if (v === null) return 0;

    const n = Number(v);
    if (Number.isNaN(n)) return 0;

    return n;
}

function getCount(stat, key) {
    if (!stat) return 0;

    if (stat[key] === undefined) return 0;
    if (stat[key] === null) return 0;

    return toNum(stat[key]);
}

function polar(cx, cy, r, a) {
    return {
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
    };
}

function buildRingSegmentPath(cx, cy, rOuter, rInner, a0, a1) {
    const p0 = polar(cx, cy, rOuter, a0);
    const p1 = polar(cx, cy, rOuter, a1);
    const q1 = polar(cx, cy, rInner, a1);
    const q0 = polar(cx, cy, rInner, a0);

    // 이 반원 범위에서는 large-arc가 거의 필요 없지만, 일반화해서 계산
    const delta = a1 - a0;
    const largeArc = delta > Math.PI ? 1 : 0;

    // outer arc: sweep=1 (시계 방향)
    // inner arc: sweep=0 (반대 방향으로 되돌아오기)
    const d =
        "M " + p0.x + " " + p0.y +
        " A " + rOuter + " " + rOuter + " 0 " + largeArc + " 1 " + p1.x + " " + p1.y +
        " L " + q1.x + " " + q1.y +
        " A " + rInner + " " + rInner + " 0 " + largeArc + " 0 " + q0.x + " " + q0.y +
        " Z";

    return d;
}

async function fetchJson(url) {
    const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const msg =
            (data && (data.error || data.message) && String(data.error || data.message).trim()) ||
            "Internal Server Error";
        throw new Error(msg);
    }

    if (data && data.error) throw new Error(String(data.error));

    return data;
}

export default function ChartChargerStatusSummary(props) {
    const [chargerStat, setChargerStat] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
        const a = getCount(chargerStat, "0(9)") + getCount(chargerStat, "1");
        const b = getCount(chargerStat, "2") + getCount(chargerStat, "3");
        const c = getCount(chargerStat, "4") + getCount(chargerStat, "5");

        const total = a + b + c;

        return {
            a,
            b,
            c,
            total,
        };
    }, [chargerStat]);

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

    const segments = useMemo(() => {
        const out = [];
        out.push({ key: "gA", label: "상태 미확인", value: grouped.a });
        out.push({ key: "gB", label: "정상", value: grouped.b });
        out.push({ key: "gC", label: "고장", value: grouped.c });
        return out;
    }, [grouped]);


    // SVG 설정 (상단 반 도넛)
    const w = 320;
    const h = 200;

    const cx = 160;
    const cy = 160;

    const rOuter = 120;
    const rInner = 78;

    const startBase = Math.PI;
    const endBase = Math.PI * 2;
    const span = endBase - startBase; // PI

    let acc = 0;
    const paths = [];
    for (let i = 0; i < segments.length; i += 1) {
        const s = segments[i];

        const frac = grouped.total > 0 ? s.value / grouped.total : 0;
        const a0 = startBase + acc * span;
        const a1 = startBase + (acc + frac) * span;

        if (s.value > 0) {
            const d = buildRingSegmentPath(cx, cy, rOuter, rInner, a0, a1);
            paths.push({
                key: s.key,
                d: d,
                title: s.label + " " + String(s.value),
                idx: i,
            });
        }

        acc += frac;
    }

    return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <svg width={w} height={h}>
                    <path
                        d={buildRingSegmentPath(cx, cy, rOuter, rInner, startBase, endBase)}
                        fill="#eee"
                    />

                    {paths.map((p) => {
                        const color = colorOfKey(p.key);
                        return (
                            <path key={p.key} d={p.d} fill={color}>
                                <title>{p.title}</title>
                            </path>
                        );
                    })}

                    <text
                        x={cx}
                        y={cy - 10}
                        textAnchor="middle"
                        style={{ fontSize: 20, fontWeight: 800, fill: "#111" }}
                    >
                        {grouped.total}
                    </text>
                    <text
                        x={cx}
                        y={cy + 12}
                        textAnchor="middle"
                        style={{ fontSize: 11, fill: "#999" }}
                    >
                        전체
                    </text>
                </svg>

                <div style={{ fontSize: 12, color: "#333", width: 160 }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>충전기 상태 현황</div>

                    {segments.map((s) => {
                        const cnt = s.value;
                        const pct = grouped.total > 0 ? Math.round((cnt * 100) / grouped.total) : 0;
                        const color = colorOfKey(s.key);

                        return (
                            <div
                                key={s.key}
                                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
                            >
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                                <div style={{ flex: 1 }}>
                                    {s.label} <span style={{ color: "#999" }}>({cnt})</span>
                                </div>
                                <div style={{ width: 42, textAlign: "right", color: "#555" }}>{pct}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}