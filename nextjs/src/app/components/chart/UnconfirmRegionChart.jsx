"use client";

import { useMemo, useState, useEffect } from "react";

const CODE_TO_LABEL = {
    "11110": "종로구",
    "11140": "중구",
    "11170": "용산구",
    "11200": "성동구",
    "11215": "광진구",
    "11230": "동대문구",
    "11260": "중랑구",
    "11290": "성북구",
    "11305": "강북구",
    "11320": "도봉구",
    "11350": "노원구",
    "11380": "은평구",
    "11410": "서대문구",
    "11440": "마포구",
    "11470": "양천구",
    "11500": "강서구",
    "11530": "구로구",
    "11545": "금천구",
    "11560": "영등포구",
    "11590": "동작구",
    "11620": "관악구",
    "11650": "서초구",
    "11680": "강남구",
    "11710": "송파구",
    "11740": "강동구",
};

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
            " M " + cx + " " + cy +
            " L " + x0 + " " + y0 +
            " A " + r + " " + r +
            " 0 " + large +
            " 1 " + x1 + " " + y1 +
            " Z ";

        out.push({
            key: seg.key,
            d: d,
            title: seg.title,
        });

        acc += frac;
    }

    return out;
}

function colorOfKey(i) {
    // TopN까지는 서로 다른 색, 마지막 기타는 회색
    if (i === 0) return "#2F6BFF"; // 파랑
    if (i === 1) return "#F5C542"; // 노랑
    if (i === 2) return "#E53935"; // 빨강
    if (i === 3) return "#6E7B8F"; // 추가 Top이 생기면
    if (i === 4) return "#2DBE7F";
    return "#999"; // 기타/나머지
}

export default function ChartUnconfirmedRatioByRegion() {
    const [chargingStation, setChargingStation] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    let topN = 3;

    useEffect(() => {
        let alive = true;

        async function run() {
            setLoading(true);
            setError("");

            try {
                const res = await fetch("/api/componentApi/UnconfirmRegionChart", {
                    method: "GET",
                    cache: "no-store",
                });

                const data = await res.json().catch(function () {
                    return null;
                });

                if (!res.ok) {
                    let msg = "데이터를 불러오지 못했습니다.";
                    if (data && data.error) msg = String(data.error);
                    if (data && data.message) msg = String(data.message);
                    throw new Error(msg);
                }

                if (!data) {
                    throw new Error("데이터를 불러오지 못했습니다.");
                }

                if (!alive) return;

                setChargingStation(data.chargingStation);
            } catch (e) {
                if (!alive) return;

                let msg = "데이터를 불러오지 못했습니다.";
                if (e && e.message) msg = String(e.message);

                setError(msg);
                setChargingStation({});
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        run();

        return () => {
            alive = false;
        };
    }, []);

    const rows = useMemo(() => {
        const out = [];
        const keys = Object.keys(chargingStation);

        for (let i = 0; i < keys.length; i += 1) {
            const code = keys[i];

            const cnt = chargingStation[code].count;

            if (cnt > 0) {
                out.push({
                    code: String(code),
                    label: CODE_TO_LABEL[code],
                    count: cnt,
                });
            }
        }

        out.sort(function (a, b) {
            return b.count - a.count;
        });

        return out;
    }, [chargingStation]);

    const sliced = useMemo(() => {
        const top = [];
        let other = 0;
        let total = 0;

        for (let i = 0; i < rows.length; i += 1) {
            total += rows[i].count;
        }

        for (let i = 0; i < rows.length; i += 1) {
            const r = rows[i];
            if (i < topN) top.push(r);
            else other += r.count;
        }

        if (other > 0) {
            top.push({ code: "OTHER", label: "기타", count: other });
        }

        return { top: top, total: total };
    }, [rows, topN]);

    const segments = useMemo(() => {
        const out = [];
        let denom = sliced.total;
        if (denom <= 0) denom = 1;

        for (let i = 0; i < sliced.top.length; i += 1) {
            const r = sliced.top[i];

            out.push({
                key: r.code,
                label: r.label,
                value: r.count,
                total: denom,
                title: r.label + " " + String(r.count),
                color: r.code === "OTHER" ? "#999" : colorOfKey(i),
            });
        }

        return out;
    }, [sliced]);

    if (loading) {
        return (
            <div
                style={{
                    width: "100%",
                    height: 240,
                    background: "#f2f2f2",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#999",
                    fontSize: 12,
                }}
            >
                불러오는 중...
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    width: "100%",
                    height: 240,
                    background: "#f2f2f2",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "crimson",
                    fontSize: 12,
                    padding: 12,
                    textAlign: "center",
                }}
            >
                {error}
            </div>
        );
    }

    if (!chargingStation || sliced.total <= 0) {
        return (
            <div
                style={{
                    width: "100%",
                    height: 240,
                    background: "#f2f2f2",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#999",
                    fontSize: 12,
                }}
            >
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
                        let fill = "#999";
                        for (let i = 0; i < segments.length; i += 1) {
                            if (segments[i].key === p.key) {
                                fill = segments[i].color; // ✅ [수정]
                                break;
                            }
                        }

                        return (
                            <path key={p.key} d={p.d} fill={fill}>
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
                        {/*{sliced.total} /!* ✅ [수정] total → sliced.total (RegionChart 총합) *!/*/}
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
                            const pct = sliced.total > 0 ? Math.round((cnt * 100) / sliced.total) : 0;
                            const color = s.color;

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
                                        {s.label} <span style={{ color: "#999" }}>({cnt})</span>
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