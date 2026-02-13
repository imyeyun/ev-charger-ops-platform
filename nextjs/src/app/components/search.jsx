"use client";

import { useEffect, useMemo, useState, memo } from "react";

// ✅ 지역 옵션(시/도 + 시/군/구)
import {
    SIDO_OPTIONS,
    SIGUN_OPTIONS,
} from "@/app/lib/regionOptions";

function mapStatToStatus(stat) {
    var n = Number(stat);
    if (n === 0 || n === 9 || n === 1) return "상태미확인";
    if (n === 2) return "사용가능";
    if (n === 3) return "충전중";
    if (n === 4 || n === 5) return "고장";
    return "상태미확인";
}

function mapChgerTypeToSpeedLabel(chgerType) {
    var code = String(chgerType === null || chgerType === undefined ? "" : chgerType);
    if (code === "02" || code === "07" || code === "08") return "완속";
    if (code !== "") return "급속";
    return "";
}

function pickStatusClass(styles, status) {
    if (status === "충전중") return styles.badgeUsing;
    if (status === "상태미확인") return styles.badgeUnknown;
    if (status === "고장") return styles.badgeBad ? styles.badgeBad : styles.badgeUnknown;
    return styles.badgeAvailable;
}

function toStringSafe(v) {
    if (v === null) return "";
    if (v === undefined) return "";
    return String(v);
}

function trimSafe(v) {
    return toStringSafe(v).trim();
}

const SearchResultList = memo(function SearchResultList(props) {
    var styles = props.styles;
    var listItems = props.listItems;
    var maxHeightPx = props.maxHeightPx;
    var onSelect = props.onSelect;

    var children = [];
    var i = 0;

    while (i < listItems.length) {
        var station = listItems[i];
        i = i + 1;

        if (!station || !station.id) continue;

        const stationId = station.id;
        var statusClass = pickStatusClass(styles, station.status);

        children.push(
            <div
                key={station.id}
                className={styles.stationRow}
                role="button"
                tabIndex={0}
                onClick={function () {
                    if (onSelect) onSelect(stationId);
                }}
                onKeyDown={function (e) {
                    if (!onSelect) return;
                    if (e.key === "Enter" || e.key === " ") onSelect(stationId);
                }}
                style={{ cursor: "pointer" }}
            >
                <div className={styles.stationName}>{station.name}</div>

                {station.status ? (
                    <span className={styles.badgeStatus + " " + statusClass}>{station.status}</span>
                ) : null}

                <span className={styles.badgeType}>{station.type}</span>
            </div>
        );
    }

    return (
        <div className={styles.leftList} style={{ "--leftListMaxHeight": String(maxHeightPx) + "px" }}>
            {children}
        </div>
    );
});

export default function Search(props) {
    var styles = props.styles;

    var region = props.region;
    var setRegion = props.setRegion;
    var city = props.city;
    var setCity = props.setCity;

    var chargeType = props.chargeType;
    var setChargeType = props.setChargeType;

    var stationName = props.stationName;
    var setStationName = props.setStationName;

    var maxHeightPx = props.maxHeightPx;
    if (maxHeightPx === null || maxHeightPx === undefined) maxHeightPx = 360;

    var onSelect = props.onSelect;

    var DEBUG = true;

    function log() {
        if (!DEBUG) return;
        console.log.apply(console, arguments);
    }

    function err() {
        console.error.apply(console, arguments);
    }

    var [loading, setLoading] = useState(false);
    var [error, setError] = useState("");

    // ✅ 검색 결과 rows만 들고 있음 (allRows 없음)
    var [rows, setRows] = useState([]);

    // ✅ 캐시 워밍업(가벼운 init 호출)
    useEffect(function () {
        var alive = true;

        async function run() {
            try {
                var res = await fetch("/api/componentApi/search?init=1", {
                    method: "GET",
                    cache: "no-store",
                });

                if (!alive) return;

                if (res.ok === false) {
                    // init 실패해도 검색 시 다시 시도될 수 있으니 여기서는 에러로 막지 않음
                    log("[Search:init] failed status:", res.status);
                    return;
                }

                var data = null;
                try {
                    data = await res.json();
                } catch (e) {
                    data = null;
                }

                log("[Search:init] ok:", data);
            } catch (e2) {
                log("[Search:init] error:", e2);
            }
        }

        run();

        return function () {
            alive = false;
        };
    }, []);

    // ✅ 시/도 선택에 따라 시/군 옵션 줄이기
    var filteredSigunOptions = useMemo(function () {
        var out = [];
        if (!region) return out;

        var i = 0;
        while (i < SIGUN_OPTIONS.length) {
            var x = SIGUN_OPTIONS[i];
            i = i + 1;

            if (!x) continue;
            var code = toStringSafe(x.code);
            if (code.indexOf(region) === 0) out.push(x);
        }

        return out;
    }, [region]);

    function handleChangeRegion(e) {
        var nextRegion = e.target.value;
        setRegion(nextRegion);
        setCity("");
    }

    async function handleSearch() {
        setError("");
        setLoading(true);
        setRows([]);

        // query 만들기 (가독성: if로만)
        var qs = [];
        if (trimSafe(region) !== "") qs.push("region=" + encodeURIComponent(trimSafe(region)));
        if (trimSafe(city) !== "") qs.push("city=" + encodeURIComponent(trimSafe(city)));
        if (trimSafe(chargeType) !== "") qs.push("chargeType=" + encodeURIComponent(trimSafe(chargeType)));
        if (trimSafe(stationName) !== "") qs.push("stationName=" + encodeURIComponent(trimSafe(stationName)));

        var url = "/api/componentApi/search";
        if (qs.length > 0) url = url + "?" + qs.join("&");

        var startedAt = Date.now();
        log("[Search] request:", url);

        try {
            var res = await fetch(url, { method: "GET", cache: "no-store" });

            var data = null;
            try {
                data = await res.json();
            } catch (e) {
                data = null;
            }

            var ms = Date.now() - startedAt;
            log("[Search] response:", res.status, "ms:", ms);

            if (res.ok === false) {
                var msg = "";
                if (data && data.error) msg = String(data.error);
                if (msg === "" && data && data.message) msg = String(data.message);
                if (msg === "") msg = "리스트를 불러오지 못했습니다.";
                throw new Error(msg);
            }

            if (!Array.isArray(data)) data = [];
            setRows(data);
        } catch (e2) {
            err("[Search] failed:", e2);
            setError(String(e2 && e2.message ? e2.message : "리스트를 불러오지 못했습니다."));
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setRegion("");
        setCity("");
        setChargeType("");
        setStationName("");
        setRows([]);
        setError("");
    }

    // 렌더용 listItems
    var listItems = useMemo(function () {
        var out = [];
        var i = 0;

        while (i < rows.length) {
            var row = rows[i];
            i = i + 1;

            if (!row) continue;

            var cs = row.chargingStation;
            var st = row.chargerStat;
            var ch = row.charger;

            var id = "";
            var name = "";
            var stat = null;
            var chgerType = "";

            if (cs && cs.statId) id = String(cs.statId);
            if (cs && cs.statNm) name = String(cs.statNm);

            if (st && st.stat !== undefined && st.stat !== null) stat = st.stat;

            if (ch && ch.chgerType) chgerType = String(ch.chgerType);

            out.push({
                id: id,
                name: name,
                status: mapStatToStatus(stat),
                type: mapChgerTypeToSpeedLabel(chgerType),
            });
        }

        return out;
    }, [rows]);

    // options 렌더(=> 없이)
    var sidoOptionEls = [];
    (function () {
        var i = 0;
        while (i < SIDO_OPTIONS.length) {
            var opt = SIDO_OPTIONS[i];
            i = i + 1;
            if (!opt) continue;
            sidoOptionEls.push(
                <option key={opt.code} value={opt.code}>
                    {opt.name}
                </option>
            );
        }
    })();

    var sigunOptionEls = [];
    (function () {
        var i = 0;
        while (i < filteredSigunOptions.length) {
            var opt = filteredSigunOptions[i];
            i = i + 1;
            if (!opt) continue;
            sigunOptionEls.push(
                <option key={opt.code} value={opt.code}>
                    {opt.name}
                </option>
            );
        }
    })();

    return (
        <div className={styles.leftPanelStack}>
            {/* 검색 UI */}
            <section className={styles.card}>
                <div className={styles.filterSection}>
                    <div className={styles.filterGroup}>
                        <div className={styles.label}>지역 선택</div>

                        <div className={styles.row2}>
                            <select className={styles.select} value={region} onChange={handleChangeRegion}>
                                <option value="">시/도</option>
                                {sidoOptionEls}
                            </select>

                            <select
                                className={styles.select}
                                value={city}
                                onChange={function (e) {
                                    setCity(e.target.value);
                                }}
                                disabled={!region}
                                title={!region ? "시/도를 먼저 선택하세요" : ""}
                            >
                                <option value="">시/군</option>
                                {sigunOptionEls}
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
                                onChange={function (e) {
                                    setChargeType(e.target.value);
                                }}
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
                                onChange={function (e) {
                                    setStationName(e.target.value);
                                }}
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

                    {(loading || error) ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: error ? "#c00" : "#666" }}>
                            {loading ? "로딩중..." : ""}
                            {error ? error : ""}
                        </div>
                    ) : null}
                </div>
            </section>

            {/* 검색 결과 리스트 */}
            <section className={styles.card}>
                <h3 className={styles.subTitle}>검색 결과</h3>

                <SearchResultList
                    styles={styles}
                    listItems={listItems}
                    maxHeightPx={maxHeightPx}
                    onSelect={onSelect}
                />
            </section>
        </div>
    );
}
