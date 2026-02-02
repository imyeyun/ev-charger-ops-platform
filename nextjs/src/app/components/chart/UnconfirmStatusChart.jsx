"use client";

import { useMemo, useState, useEffect } from "react";

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
    if (key === "0(9)") return "#F5C542"; // 노랑
    if (key === "1") return "#2F6BFF";    // 파랑
    if (key === "2") return "#E67E22";    // 주황
    if (key === "4") return "#E53935";    // 빨강
    return "#999";
}

function labelOfKey(key) {
    if (key === "0(9)") return "상태미확인(0/9)";
    if (key === "1") return "상태 1";
    if (key === "2") return "상태 2";
    if (key === "4") return "상태 4";
    return String(key);
}

export default function ChartUnconfirmedStatus(props) {
    const external = props && props.chargerStat ? props.chargerStat : null;

    const apiUrl =
        (props && typeof props.apiUrl === "string" && props.apiUrl.trim())
            ? props.apiUrl.trim()
            : "/api/componentApi/UnconfirmStatusChart"; // ✅ 너 route 경로에 맞게 수정

    const [chargerStat, setChargerStat] = useState(external);
    const [loading, setLoading] = useState(!external);
    const [error, setError] = useState("");

    useEffect(() => {
        if (external) {
            setChargerStat(external);
            setLoading(false);
            setError("");
        }
    }, [external]);

    useEffect(() => {
        let alive = true;

        if (external) return;

        async function run() {
            setLoading(true);
            setError("");

            try {
                const res = await fetch(apiUrl, {
                    method: "GET",
                    cache: "no-store",
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    const msg = (data && (data.error || data.message)) || "데이터를 불러오지 못했습니다.";
                    throw new Error(String(msg));
                }

                const stat =
                    (data && data.chargerStat && typeof data.chargerStat === "object" && !Array.isArray(data.chargerStat))
                        ? data.chargerStat
                        : (data && typeof data === "object" && !Array.isArray(data) ? data : null);

                if (alive) setChargerStat(stat);
            } catch (e) {
                if (alive) {
                    setError(String((e && e.message) || "데이터를 불러오지 못했습니다."));
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
    }, [apiUrl, external]);

    const counts = useMemo(() => {
        const out = {
            k0: 0,
            k1: 0,
            k2: 0,
            k4: 0,
            total: 0,
        };

        if (chargerStat) {
            out.k0 = getCount(chargerStat, "0(9)");
            out.k1 = getCount(chargerStat, "1");
            out.k2 = getCount(chargerStat, "2");
            out.k4 = getCount(chargerStat, "4");
        }

        out.total = out.k0 + out.k1 + out.k2 + out.k4;

        return out;
    }, [chargerStat]);

    const segments = useMemo(() => {
        const total = counts.total;

        return [
            { key: "0(9)", value: counts.k0, total: total, title: "0(9) " + String(counts.k0) },
            { key: "1", value: counts.k1, total: total, title: "1 " + String(counts.k1) },
            { key: "2", value: counts.k2, total: total, title: "2 " + String(counts.k2) },
            { key: "4", value: counts.k4, total: total, title: "4 " + String(counts.k4) },
        ];
    }, [counts]);

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
    if (!chargerStat || counts.total <= 0) {
        return (
            <div style={{ width: "100%", height: 240, background: "#f2f2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
                데이터 없음
            </div>
        );
    }

    const w = 320;
    const h = 240;
    const cx = 120;
    const cy = 120;
    const r = 80;

    const paths = buildPiePaths(cx, cy, r, segments);

    return (
        <div style={{ width: "100%", height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <svg width={w} height={h}>
                    {paths.map(function (p) {
                        const color = colorOfKey(p.key);
                        return (
                            <path key={p.key} d={p.d} fill={color}>
                                <title>{p.title}</title>
                            </path>
                        );
                    })}
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 18, fontWeight: 800, fill: "#111" }}>
                        {counts.total}
                    </text>
                </svg>

                <div style={{ fontSize: 12, color: "#333", width: 160 }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>상태 미확인</div>

                    {segments.map(function (s) {
                        const cnt = s.value;
                        const pct = Math.round((cnt * 100) / (counts.total > 0 ? counts.total : 1));
                        const color = colorOfKey(s.key);

                        return (
                            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                                <div style={{ flex: 1 }}>
                                    {labelOfKey(s.key)} <span style={{ color: "#999" }}>({cnt})</span>
                                </div>
                                <div style={{ width: 42, textAlign: "right", color: "#555" }}>{pct}%</div>
                            </div>
                        );
                    })}

                    <div style={{ marginTop: 10, color: "#999", fontSize: 11 }}>합계 {counts.total}</div>
                </div>
            </div>
        </div>
    );
}