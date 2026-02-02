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


function toNum(v) {
    if (v === undefined) return 0;
    if (v === null) return 0;

    const n = Number(v);
    if (Number.isNaN(n)) return 0;

    return n;
}

function getCount(chargingStation, code) {
    if (!chargingStation) return 0;

    const v = chargingStation[code];

    if (typeof v === "number" || typeof v === "string") {
        return toNum(v);
    }

    if (v && typeof v === "object" && !Array.isArray(v)) {
        if (v.count !== undefined && v.count !== null) return toNum(v.count);
    }

    return 0;
}

function labelOfCode(code) {
    if (!code) return "기타";

    const s = String(code).trim();
    if (!s) return "기타";

    const label = CODE_TO_LABEL[s];
    if (label !== undefined && label !== null) return label;

    return s;
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

function colorByIndex(i) {
    // TopN까지는 서로 다른 색, 마지막 기타는 회색
    if (i === 0) return "#2F6BFF"; // 파랑
    if (i === 1) return "#F5C542"; // 노랑
    if (i === 2) return "#E53935"; // 빨강
    if (i === 3) return "#6E7B8F"; // 추가 Top이 생기면
    if (i === 4) return "#2DBE7F";
    return "#999"; // 기타/나머지
}

export default function ChartUnconfirmedRatioByRegion(props) {
    const [chargingStation, setChargingStation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    let topN = 3;
    if (props && props.topN !== undefined && props.topN !== null) {
        const n = Number(props.topN);
        if (!Number.isNaN(n) && n > 0) topN = n;
    }

    const apiUrl =
        (props && typeof props.apiUrl === "string" && props.apiUrl.trim())
            ? props.apiUrl.trim()
            : "/api/componentApi/UnconfirmRegionChart";

    useEffect(() => {
        let alive = true;

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

                const station =
                    (data && data.chargingStation && typeof data.chargingStation === "object" && !Array.isArray(data.chargingStation))
                        ? data.chargingStation
                        : (data && typeof data === "object" && !Array.isArray(data) ? data : null);

                if (alive) setChargingStation(station);
            } catch (e) {
                if (alive) {
                    const msg = e && e.message ? String(e.message) : "데이터를 불러오지 못했습니다.";
                    setError(msg);
                    setChargingStation(null);
                }
            } finally {
                if (alive) setLoading(false);
            }
        }

        run();
        return () => {
            alive = false;
        };
    }, [apiUrl]);

    const rows = useMemo(() => {
        const out = [];

        if (!chargingStation) return out;
        if (typeof chargingStation !== "object") return out;
        if (Array.isArray(chargingStation)) return out;

        const keys = Object.keys(chargingStation);

        for (let i = 0; i < keys.length; i += 1) {
            const code = keys[i];

            const cnt = getCount(chargingStation, code);

            if (cnt > 0) {
                out.push({
                    code: String(code),
                    label: labelOfCode(code),
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
                color: r.code === "OTHER" ? "#999" : colorByIndex(i),
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
    const cx = 120;
    const cy = 120;
    const r = 80;

    const paths = buildPiePaths(cx, cy, r, segments);

    return (
        <div style={{ width: "100%", height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <svg width={w} height={h}>
                    {paths.map(function (p) {
                        let fill = "#999";

                        for (let i = 0; i < segments.length; i += 1) {
                            if (segments[i].key === p.key) {
                                fill = segments[i].color;
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
                        {sliced.total}
                    </text>
                </svg>

                <div style={{ fontSize: 12, color: "#333", width: 160 }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>지역별 상태 미확인</div>

                    {segments.map(function (s) {
                        const cnt = s.value;

                        let pct = 0;
                        if (sliced.total > 0) {
                            pct = Math.round((cnt * 100) / sliced.total);
                        }

                        return (
                            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                                <div style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {s.label} <span style={{ color: "#999" }}>({cnt})</span>
                                </div>
                                <div style={{ width: 42, textAlign: "right", color: "#555" }}>{pct}%</div>
                            </div>
                        );
                    })}

                    <div style={{ marginTop: 10, color: "#999", fontSize: 11 }}>
                        Top {topN} + 기타
                    </div>
                </div>
            </div>
        </div>
    );
}