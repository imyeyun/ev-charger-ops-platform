"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/app/components/Header";
import ChatWidget from "@/app/components/ChatWidget";
import styles from "./page.module.css";

import UnconfirmStatusChart from "@/app/components/chart/UnconfirmStatusChart";
import UnconfirmRegionChart from "@/app/components/chart/UnconfirmRegionChart";
import SummaryChart from "@/app/components/chart/SummaryChart";

import Search from "@/app/components/search";
import PagedList from "@/app/components/list/PagedList";

export default function MonitoringPage() {
    const router = useRouter();

    const LEFT_LIST_VISIBLE_COUNT = 7;
    const LEFT_ROW_HEIGHT = 36;
    const LEFT_ROW_GAP = 8;
    const leftListMaxHeightPx =
        LEFT_LIST_VISIBLE_COUNT * LEFT_ROW_HEIGHT + (LEFT_LIST_VISIBLE_COUNT - 1) * LEFT_ROW_GAP;

    const [region, setRegion] = useState("");
    const [city, setCity] = useState("");
    const [stationType, setStationType] = useState("");
    const [chargeType, setChargeType] = useState("");
    const [stationName, setStationName] = useState("");

    const [chatOpen, setChatOpen] = useState(false);

    // 더미
    const stationList = useMemo(
        () => [
            { id: 1, name: "충전소명 1", status: "사용가능", type: "완속" },
            { id: 2, name: "충전소명 2", status: "사용가능", type: "완속" },
            { id: 3, name: "충전소명 3", status: "사용중", type: "급속" },
            { id: 4, name: "충전소명 4", status: "사용가능", type: "완속" },
            { id: 5, name: "충전소명 5", status: "상태미확인", type: "완속" },
            { id: 6, name: "충전소명 6", status: "사용가능", type: "급속" },
            { id: 7, name: "충전소명 7", status: "사용가능", type: "완속" },
            { id: 8, name: "충전소명 8", status: "사용가능", type: "완속" },
            { id: 9, name: "충전소명 9", status: "사용가능", type: "완속" },
            { id: 10, name: "충전소명 10", status: "사용가능", type: "완속" },
            { id: 11, name: "충전소명 11", status: "사용가능", type: "급속" },
            { id: 12, name: "충전소명 12", status: "사용가능", type: "완속" },
        ],
        []
    );

    const riskStations = useMemo(
        () => Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `충전소명 ${i + 1}` })),
        []
    );

    const unconfirmedStations = useMemo(
        () => Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `충전소명 ${i + 1}` })),
        []
    );

    const goDetail = (id) => router.push(`/pages/monitoringDetail/${id}`);

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

    const handleAlarmSend = () => {
        alert("알림 전송(임시) - API 연결 시 실제 전송 로직으로 교체");
    };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.main}>
                <div className={styles.inner}>
                    <div className={styles.dashboardGrid}>
                        <div className={styles.leftPanel}>
                            <Search
                                styles={styles}
                                region={region}
                                setRegion={setRegion}
                                city={city}
                                setCity={setCity}
                                stationType={stationType}
                                setStationType={setStationType}
                                chargeType={chargeType}
                                setChargeType={setChargeType}
                                stationName={stationName}
                                setStationName={setStationName}
                                onSearch={handleSearch}
                                onReset={handleReset}
                                stations={stationList}
                                maxHeightPx={leftListMaxHeightPx}
                                onSelect={goDetail}
                            />
                        </div>

                        <section className={styles.card}>
                            <h3 className={styles.cardTitle}>상태미확인 충전기 현황</h3>
                            <UnconfirmStatusChart />
                        </section>

                        <section className={styles.card}>
                            <h3 className={styles.cardTitle}>지역별 상태 미확인 비율</h3>
                            <UnconfirmRegionChart />
                        </section>

                        <section className={styles.card}>
                            <h3 className={styles.cardTitle}>충전기 상태 현황</h3>
                            <SummaryChart total={152} />
                        </section>


                        <PagedList
                            styles={styles}
                            title="이상탐지 위험 충전소 리스트"
                            items={riskStations}
                            pageSize={5}
                            onView={goDetail}
                        />

                        <PagedList
                            styles={styles}
                            title="상태 미확인 충전소 리스트"
                            items={unconfirmedStations}
                            pageSize={5}
                            onView={goDetail}
                        />

                        <div className={styles.gridEmpty} />
                    </div>
                </div>

                <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
            </main>

            <div className={styles.fixedButtons}>
                <button className={styles.chatBtn} onClick={() => setChatOpen((p) => !p)}>
                    챗봇
                </button>
                <button className={styles.alarmBtn} onClick={handleAlarmSend}>
                    알림 전송
                </button>
            </div>
        </div>
    );
}
