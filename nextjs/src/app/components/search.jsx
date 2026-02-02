"use client";

import StationList from "@/app/components/list/UncheckList";

export default function Search({
                                   styles,
                                   region,
                                   setRegion,
                                   city,
                                   setCity,
                                   stationType,
                                   setStationType,
                                   chargeType,
                                   setChargeType,
                                   stationName,
                                   setStationName,
                                   onSearch,
                                   onReset,

                                   stations,
                                   maxHeightPx,
                                   onSelect,
                               }) {
    return (
        <div className={styles.leftPanelStack}>
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
                        <div className={styles.label}>충전소 타입</div>

                        <div className={styles.typeBlock}>
                            <select
                                className={styles.selectFull}
                                value={chargeType}
                                onChange={(e) => setChargeType(e.target.value)}
                            >
                                <option value="">전체</option>
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
                        <button className={styles.primaryBtn} onClick={onSearch}>
                            검색하기
                        </button>
                        <button className={styles.ghostBtn} onClick={onReset}>
                            초기화
                        </button>
                    </div>
                </div>
            </section>

            <StationList
                styles={styles}
                title="충전소명"
                stations={stations}
                maxHeightPx={maxHeightPx}
                onSelect={onSelect}
            />
        </div>
    );
}
