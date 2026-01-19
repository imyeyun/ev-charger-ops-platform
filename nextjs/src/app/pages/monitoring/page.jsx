"use client";

import { useMemo, useState } from "react";
import Header from "@/app/components/Header";
import ChatWidget from "@/app/components/ChatWidget";
import styles from "./page.module.css";

// ✅ 차트 컴포넌트 연결
import UnconfirmStatusChart from "@/app/components/UnconfirmStatusChart";
import UnconfirmRegionChart from "@/app/components/UnconfirmRegionChart";
import SummaryChart from "@/app/components/SummaryChart";

export default function MonitoringPage() {
    // =========================
    // 페이지 설정
    // =========================
    const LIST_PAGE_SIZE = 5;
    const LEFT_LIST_VISIBLE_COUNT = 7;

    // 왼쪽 리스트 높이 계산(보이는 줄 수 기준)
    const LEFT_ROW_HEIGHT = 36;
    const LEFT_ROW_GAP = 8;
    const LEFT_LIST_MAX_HEIGHT =
        LEFT_LIST_VISIBLE_COUNT * LEFT_ROW_HEIGHT +
        (LEFT_LIST_VISIBLE_COUNT - 1) * LEFT_ROW_GAP;

    // =========================
    // 필터 state
    // =========================
    const [region, setRegion] = useState("");
    const [city, setCity] = useState("");
    const [stationType, setStationType] = useState("");
    const [chargeType, setChargeType] = useState("");
    const [stationName, setStationName] = useState("");

    // ✅ ChatWidget 토글
    const [chatOpen, setChatOpen] = useState(false);

    // =========================
    // 더미 데이터
    // =========================
    const riskStations = useMemo(
        () => Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `충전소명 ${i + 1}` })),
        []
    );

    const unconfirmedStations = useMemo(
        () => Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `충전소명 ${i + 1}` })),
        []
    );

    const stationList = useMemo(
        () => [
            { name: "충전소명", status: "사용가능", type: "완속" },
            { name: "충전소명", status: "사용가능", type: "완속" },
            { name: "충전소명", status: "사용중", type: "급속" },
            { name: "충전소명", status: "사용가능", type: "완속" },
            { name: "충전소명", status: "상태미확인", type: "완속" },
            { name: "충전소명", status: "사용가능", type: "급속" },
            { name: "충전소명", status: "사용가능", type: "완속" },
            { name: "충전소명", status: "사용가능", type: "완속" },
            { name: "충전소명", status: "사용가능", type: "완속" },
            { name: "충전소명", status: "사용가능", type: "완속" },
            { name: "충전소명", status: "사용가능", type: "급속" },
            { name: "충전소명", status: "사용가능", type: "완속" },
        ],
        []
    );

    // =========================
    // 검색/초기화
    // =========================
    const handleSearch = () => {
        console.log("검색:", { region, city, stationType, chargeType, stationName });
    };

    const handleReset = () => {
        setRegion("");
        setCity("");
        setStationType("");
        setChargeType("");
        setStationName("");
    };

    // =========================
    // 페이징
    // =========================
    const [riskPage, setRiskPage] = useState(1);
    const [unconfirmedPage, setUnconfirmedPage] = useState(1);

    const riskTotalPages = Math.max(1, Math.ceil(riskStations.length / LIST_PAGE_SIZE));
    const unconfirmedTotalPages = Math.max(1, Math.ceil(unconfirmedStations.length / LIST_PAGE_SIZE));

    const riskStart = (riskPage - 1) * LIST_PAGE_SIZE;
    const unconfirmedStart = (unconfirmedPage - 1) * LIST_PAGE_SIZE;

    const riskPageItems = riskStations.slice(riskStart, riskStart + LIST_PAGE_SIZE);
    const unconfirmedPageItems = unconfirmedStations.slice(
        unconfirmedStart,
        unconfirmedStart + LIST_PAGE_SIZE
    );

    const getPagination = (current, total) => {
        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

        const pages = new Set([1, total, current, current - 1, current + 1]);
        const nums = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

        const result = [];
        for (let i = 0; i < nums.length; i++) {
            if (i > 0 && nums[i] - nums[i - 1] > 1) result.push("...");
            result.push(nums[i]);
        }
        return result;
    };

    const Pagination = ({ page, totalPages, onChange }) => {
        const items = getPagination(page, totalPages);

        return (
            <div className={styles.pagination}>
                <button
                    className={styles.pageArrow}
                    onClick={() => page > 1 && onChange(page - 1)}
                    disabled={page <= 1}
                >
                    &lt;
                </button>

                {items.map((p, idx) => {
                    if (p === "...") {
                        return (
                            <span key={`dots-${idx}`} className={styles.pageDots}>
                ...
              </span>
                        );
                    }

                    const active = p === page;
                    return (
                        <button
                            key={p}
                            className={`${styles.pageBtn} ${active ? styles.pageBtnActive : ""}`}
                            onClick={() => onChange(p)}
                        >
                            {p}
                        </button>
                    );
                })}

                <button
                    className={styles.pageArrow}
                    onClick={() => page < totalPages && onChange(page + 1)}
                    disabled={page >= totalPages}
                >
                    &gt;
                </button>
            </div>
        );
    };

    // =========================
    // UI
    // =========================
    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.main}>
                <div className={styles.inner}>
                    {/* ===== 상단 1행 (필터 + 차트3개) ===== */}
                    <div className={styles.topGrid}>
                        {/* 좌측 필터 카드 */}
                        <section className={styles.card}>
                            <div className={styles.filterSection}>
                                <div className={styles.filterGroup}>
                                    <div className={styles.label}>지역 선택</div>
                                    <div className={styles.row2}>
                                        <select className={styles.select} value={region} onChange={(e) => setRegion(e.target.value)}>
                                            <option value="">시/도</option>
                                        </select>
                                        <select className={styles.select} value={city} onChange={(e) => setCity(e.target.value)}>
                                            <option value="">시/군</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.filterGroup}>
                                    <div className={styles.label}>충전소 분류</div>
                                    <select
                                        className={styles.selectFull}
                                        value={stationType}
                                        onChange={(e) => setStationType(e.target.value)}
                                    >
                                        <option value="">전체</option>
                                    </select>
                                </div>

                                <div className={styles.filterGroup}>
                                    <div className={styles.label}>충전소 타입</div>

                                    {/* ✅ (요구) 타입(전체) ↔ 충전소명 간격: typeBlock + gap */}
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
                                    <button className={styles.primaryBtn} onClick={handleSearch}>
                                        검색하기
                                    </button>
                                    <button className={styles.ghostBtn} onClick={handleReset}>
                                        초기화
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* 차트 1 */}
                        <section className={styles.card}>
                            <h3 className={styles.cardTitle}>상태미확인 충전기 현황</h3>
                            <UnconfirmStatusChart />
                        </section>

                        {/* 차트 2 */}
                        <section className={styles.card}>
                            <h3 className={styles.cardTitle}>지역별 상태 미확인 비율</h3>
                            <UnconfirmRegionChart />
                        </section>

                        {/* 차트 3 */}
                        <section className={styles.card}>
                            <h3 className={styles.cardTitle}>충전기 상태 현황</h3>
                            <SummaryChart  total={152} />
                        </section>
                    </div>

                    {/* ===== 하단 2행 (좌측 리스트 + 가운데/우측 리스트) ===== */}
                    <div className={styles.bottomGrid}>
                        {/* 좌측 충전소 리스트 카드 */}
                        <section className={styles.card}>
                            <h3 className={styles.subTitle}>충전소명</h3>

                            {/* ✅ (요구) CSS 변수 주입: --leftListMaxHeight */}
                            <div
                                className={styles.leftList}
                                style={{ "--leftListMaxHeight": `${LEFT_LIST_MAX_HEIGHT}px` }}
                            >
                                {stationList.map((station, idx) => {
                                    const statusClass =
                                        station.status === "사용중"
                                            ? styles.badgeUsing
                                            : station.status === "상태미확인"
                                                ? styles.badgeUnknown
                                                : styles.badgeAvailable;

                                    return (
                                        <div key={idx} className={styles.stationRow}>
                                            <div className={styles.stationName}>{station.name}</div>

                                            {station.status && (
                                                <span className={`${styles.badgeStatus} ${statusClass}`}>
                          {station.status}
                        </span>
                                            )}

                                            <span className={`${styles.badgeType}`}>
                        {station.type}
                      </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 가운데: 이상탐지 위험 리스트 */}
                        <section className={styles.card}>
                            <h3 className={styles.listTitle}>이상탐지 위험 충전소 리스트</h3>

                            <div className={styles.listBody}>
                                {riskPageItems.map((s) => (
                                    <div key={s.id} className={styles.listItemRow}>
                                        <span className={styles.listItemText}>{s.name}</span>
                                        <button className={styles.viewBtn}>보기</button>
                                    </div>
                                ))}
                            </div>

                            <Pagination page={riskPage} totalPages={riskTotalPages} onChange={setRiskPage} />
                        </section>

                        {/* 우측: 상태 미확인 리스트 */}
                        <section className={styles.card}>
                            <h3 className={styles.listTitle}>상태 미확인 충전소 리스트</h3>

                            <div className={styles.listBody}>
                                {unconfirmedPageItems.map((s) => (
                                    <div key={s.id} className={styles.listItemRow}>
                                        <span className={styles.listItemText}>{s.name}</span>
                                        <button className={styles.viewBtn}>보기</button>
                                    </div>
                                ))}
                            </div>

                            <Pagination
                                page={unconfirmedPage}
                                totalPages={unconfirmedTotalPages}
                                onChange={setUnconfirmedPage}
                            />
                        </section>
                    </div>
                </div>

                {/* ✅ ChatWidget */}
                <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
            </main>

            {/* 하단 고정 버튼 */}
            <div className={styles.fixedButtons}>
                <button className={styles.chatBtn} onClick={() => setChatOpen((p) => !p)}>
                    챗봇
                </button>

                <button className={styles.alarmBtn}>알림 전송</button>
            </div>
        </div>
    );
}
