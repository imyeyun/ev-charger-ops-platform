"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

/**
 * 충전기 상태(stat) → 라벨
 * - 0, 9, 1 => 상태미확인
 * - 2 => 사용가능
 * - 3 => 충전중
 * - 4, 5 => 고장
 */
function mapStatToStatus(stat) {
    const n = Number(stat);
    if (n === 0 || n === 9 || n === 1) return "상태미확인";
    if (n === 2) return "사용가능";
    if (n === 3) return "충전중";
    if (n === 4 || n === 5) return "고장";
    return "상태미확인";
}

/**
 * chgerType("01"~"10") → 급속/완속
 * - 완속: 02, 07, 08
 * - 그 외: 급속
 */
function mapChgerTypeToSpeedLabel(chgerType) {
    const code = String(chgerType ?? "");
    if (code === "02" || code === "07" || code === "08") return "완속";
    if (code) return "급속";
    return "";
}

function pickStatusClass(styles, status) {
    // 기존 UncheckList 스타일명 기준
    if (status === "충전중") return styles.badgeUsing;
    if (status === "상태미확인") return styles.badgeUnknown;
    if (status === "고장") return styles.badgeBad ?? styles.badgeUnknown;
    return styles.badgeAvailable; // 사용가능
}

function applyFilters(rows, { region, city, chargeType, stationName }) {
    const base = Array.isArray(rows) ? rows : [];
    const nameQ = (stationName ?? "").trim();

    return base.filter((row) => {
        const cs = row?.chargingStation;
        const ch = row?.charger;

        const csRegion = cs?.zcodeDescription ?? "";
        const csCity = cs?.zscodeDescription ?? "";
        const csName = cs?.statNm ?? "";

        if (region && csRegion !== region) return false;
        if (city && csCity !== city) return false;

        if (chargeType) {
            const speed = mapChgerTypeToSpeedLabel(ch?.chgerType);
            if (speed !== chargeType) return false;
        }

        if (nameQ) {
            if (!String(csName).includes(nameQ)) return false;
        }

        return true;
    });
}

export default function Search({
                                   styles,

                                   region,
                                   setRegion,
                                   city,
                                   setCity,

                                   chargeType,
                                   setChargeType,

                                   stationName,
                                   setStationName,

                                   maxHeightPx = 360,

                                   // 클릭 시 상세 이동은 부모에서 처리
                                   onSelect,
                               }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 원본 + 표시용(검색 결과)
    const [allRows, setAllRows] = useState([]);
    const [rows, setRows] = useState([]);

    // ✅ API 호출 (마운트 시 1회) - alive 체크 패턴
    useEffect(() => {
        let alive = true;

        async function run() {
            setLoading(true);
            setError("");

            try {
                const res = await axios.get("/api/componentApi/search", {
                    timeout: 15000,
                    validateStatus: () => true, // route가 주는 상태코드 그대로 처리
                    headers: {
                        "Cache-Control": "no-store",
                        Pragma: "no-cache",
                    },
                });

                if (!alive) return;

                if (res.status < 200 || res.status >= 300) {
                    const msg = res.data?.error || "리스트를 불러오지 못했습니다.";
                    throw new Error(msg);
                }

                // ✅ 응답 배열인지 확인은 여기 (setState 직전)
                const data = Array.isArray(res.data) ? res.data : [];
                setAllRows(data);
                setRows([]); // 초기에 표시 X
            } catch (e) {
                if (!alive) return;
                console.error("[Search] load failed:", e);
                setError(e?.message || "리스트를 불러오지 못했습니다.");
                setAllRows([]);
                setRows([]);
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

    // 검색/초기화 버튼 (프론트 필터링)
    const handleSearch = () => {
        setRows(applyFilters(allRows, { region, city, chargeType, stationName }));
    };

    const handleReset = () => {
        setRegion("");
        setCity("");
        setChargeType("");
        setStationName("");
        setRows([]);
    };

    // 렌더용 변환(필드명만 맞춤)
    const listItems = useMemo(() => {
        return rows.map((row) => {
            const cs = row?.chargingStation;
            const cstat = row?.chargerStat;
            const ch = row?.charger;

            return {
                id: cs?.statId,
                name: cs?.statNm ?? "",
                status: mapStatToStatus(cstat?.stat),
                type: mapChgerTypeToSpeedLabel(ch?.chgerType),
            };
        });
    }, [rows]);

    return (
        <div className={styles.leftPanelStack}>
            {/* 검색 UI */}
            <section className={styles.card}>
                <div className={styles.filterSection}>
                    <div className={styles.filterGroup}>
                        <div className={styles.label}>지역 선택</div>

                        <div className={styles.row2}>
                            <select
                                className={styles.select}
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                            >
                                <option value="">시/도</option>
                            </select>

                            <select
                                className={styles.select}
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            >
                                <option value="">시/군</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ height: 10 }} />

                    <div className={styles.filterGroup}>
                        <div className={styles.label}>충전기 타입</div>

                        <div className={styles.typeBlock}>
                            <select
                                className={styles.selectFull}
                                value={chargeType}
                                onChange={(e) => setChargeType(e.target.value)}
                            >
                                <option value="">전체</option>
                                <option value="급속">급속</option>
                                <option value="완속">완속</option>
                            </select>

                            <input
                                type="text"
                                className={styles.stationNameInput}
                                placeholder="충전소명"
                                value={stationName}
                                onChange={(e) => setStationName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.btnRow}>
                        <button className={styles.primaryBtn} onClick={handleSearch}>
                            검색하기
                        </button>
                        <button className={styles.ghostBtn} onClick={handleReset}>
                            초기화
                        </button>
                    </div>

                    {/* 로딩/에러 표시(원하면 위치 옮겨도 됨) */}
                    {(loading || error) && (
                        <div style={{ marginTop: 8, fontSize: 12, color: error ? "#c00" : "#666" }}>
                            {loading ? "로딩중..." : ""}
                            {error ? error : ""}
                        </div>
                    )}
                </div>
            </section>

            {/* 검색 결과 리스트 (UncheckList 형식 복사) */}
            <section className={styles.card}>
                <h3 className={styles.subTitle}>검색 결과</h3>

                <div
                    className={styles.leftList}
                    style={{ "--leftListMaxHeight": `${maxHeightPx}px` }}
                >
                    {listItems.map((station) => {
                        if (!station.id) return null;

                        const statusClass = pickStatusClass(styles, station.status);

                        return (
                            <div
                                key={station.id}
                                className={styles.stationRow}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelect?.(station.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") onSelect?.(station.id);
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                <div className={styles.stationName}>{station.name}</div>

                                {station.status && (
                                    <span className={`${styles.badgeStatus} ${statusClass}`}>
                    {station.status}
                  </span>
                                )}

                                <span className={styles.badgeType}>{station.type}</span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}