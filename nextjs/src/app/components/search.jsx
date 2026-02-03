"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

// ✅ 지역 옵션(시/도 + 시/군/구) 데이터는 별도 파일에서 import
import {
    SIDO_OPTIONS,
    SIGUN_OPTIONS,
    SIDO_NAME_BY_CODE,
    SIGUN_NAME_BY_CODE,
} from "@/app/lib/regionOptions";

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

/**
 * 필터 적용
 * - region/city는 "코드"를 value로 사용
 * - 백엔드 row에 코드필드가 있으면(code 우선) 그걸 쓰고,
 *   없으면 description(이름)으로도 비교 가능하게 fallback 처리
 */
function applyFilters(rows, { region, city, chargeType, stationName }) {
    const base = Array.isArray(rows) ? rows : [];
    const nameQ = (stationName ?? "").trim();

    const regionName = region ? SIDO_NAME_BY_CODE[region] : "";
    const cityName = city ? SIGUN_NAME_BY_CODE[city] : "";

    return base.filter((row) => {
        const cs = row?.chargingStation;
        const ch = row?.charger;

        // ✅ 코드(있으면 우선)
        const csRegionCode = String(cs?.zcode ?? cs?.zCode ?? cs?.zcodeId ?? "");
        const csCityCode = String(cs?.zscode ?? cs?.zsCode ?? cs?.zscodeId ?? "");

        // ✅ 이름(description) fallback
        const csRegionName = String(cs?.zcodeDescription ?? cs?.zCodeDescription ?? "");
        const csCityName = String(cs?.zscodeDescription ?? cs?.zsCodeDescription ?? "");

        const csName = cs?.statNm ?? "";

        // 시/도 필터
        if (region) {
            const matchByCode = csRegionCode && csRegionCode === region;
            const matchByName = regionName && csRegionName && csRegionName === regionName;
            if (!matchByCode && !matchByName) return false;
        }

        // 시/군/구 필터
        if (city) {
            const matchByCode = csCityCode && csCityCode === city;
            const matchByName = cityName && csCityName && csCityName === cityName;
            if (!matchByCode && !matchByName) return false;
        }

        // 급속/완속 필터
        if (chargeType) {
            const speed = mapChgerTypeToSpeedLabel(ch?.chgerType);
            if (speed !== chargeType) return false;
        }

        // 충전소명 검색(부분 포함)
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

    // ✅ 시/도 선택에 따라 시/군 옵션을 줄여서 보여줌
    const filteredSigunOptions = useMemo(() => {
        if (!region) return [];
        return SIGUN_OPTIONS.filter((x) => x.code.startsWith(region));
    }, [region]);

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

    // ✅ 시/도 변경 시 시/군 초기화
    const handleChangeRegion = (e) => {
        const nextRegion = e.target.value;
        setRegion(nextRegion);
        setCity(""); // 중요: 시/도 바뀌면 시/군 선택값 제거
    };

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
                            {/* ✅ 시/도 */}
                            <select className={styles.select} value={region} onChange={handleChangeRegion}>
                                <option value="">시/도</option>
                                {SIDO_OPTIONS.map((opt) => (
                                    <option key={opt.code} value={opt.code}>
                                        {opt.name}
                                    </option>
                                ))}
                            </select>

                            {/* ✅ 시/군/구 (시/도 선택 시에만 표시/활성화) */}
                            <select
                                className={styles.select}
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                disabled={!region}
                                title={!region ? "시/도를 먼저 선택하세요" : ""}
                            >
                                <option value="">시/군</option>
                                {filteredSigunOptions.map((opt) => (
                                    <option key={opt.code} value={opt.code}>
                                        {opt.name}
                                    </option>
                                ))}
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

                    {/* 로딩/에러 표시 */}
                    {(loading || error) && (
                        <div style={{ marginTop: 8, fontSize: 12, color: error ? "#c00" : "#666" }}>
                            {loading ? "로딩중..." : ""}
                            {error ? error : ""}
                        </div>
                    )}
                </div>
            </section>

            {/* 검색 결과 리스트 */}
            <section className={styles.card}>
                <h3 className={styles.subTitle}>검색 결과</h3>

                <div className={styles.leftList} style={{ "--leftListMaxHeight": `${maxHeightPx}px` }}>
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
                                    <span className={`${styles.badgeStatus} ${statusClass}`}>{station.status}</span>
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
