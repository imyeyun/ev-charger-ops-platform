"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "@/app/components/Header";
import {
    loadMonitoringDashboard,
    saveMonitoringDashboard,
} from "@/app/lib/monitoringDashboardStorage";

import ChatWidget from "@/app/components/ChatWidget";
import styles from "./page.module.css";

import UnconfirmStatusChart from "@/app/components/chart/UnconfirmStatusChart";
import UnconfirmRegionChart from "@/app/components/chart/UnconfirmRegionChart";
import SummaryChart from "@/app/components/chart/SummaryChart";
import DailyUnconfirmBarChart from "@/app/components/chart/DailyUnconfirmBarChart";


import Search from "@/app/components/search";
import AnomalyList from "@/app/components/list/AnomalyList";
import UncheckList from "@/app/components/list/UncheckList";

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
    // ✅ 일별 상태미확인 카운트 (API에서 받아옴)
    const [dailyUnconfirm, setDailyUnconfirm] = useState([]);
    const [dailyUnconfirmLoading, setDailyUnconfirmLoading] = useState(false);
    const [dailyUnconfirmError, setDailyUnconfirmError] = useState(null);


    // 🎨 편집 모드 및 레이아웃 state
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);

    useEffect(() => {
        const fetchDaily = async () => {
            try {
                const qs = new URLSearchParams({
                    region,
                    city,
                    stationType,
                    chargeType,
                    stationName,
                });

                const res = await fetch(
                    `/spring-api/monitoring/unconfirm/daily?${qs.toString()}`,
                    { cache: "no-store" }
                );

                if (!res.ok) throw new Error();

                const data = await res.json();

                setDailyUnconfirm(
                    Array.isArray(data)
                        ? data.map(d => ({
                            date: d.date,
                            count: Number(d.count),
                        }))
                        : []
                );
            } catch {
                setDailyUnconfirm([]);
            }
        };

        fetchDaily();
    }, [region, city, stationType, chargeType, stationName]);


    // 📊 기본 레이아웃 설정 (그리드 위치: row/col로 관리)
    const defaultLayout = [
        { id:"chart1", component:"UnconfirmStatusChart",  title:"상태미확인 충전기 현황",      gridArea:"2 / 2 / 3 / 3" },
        { id:"chart2", component:"UnconfirmRegionChart",  title:"지역별 상태 미확인 비율",     gridArea:"2 / 3 / 3 / 4" },
        { id:"chart3", component:"SummaryChart",          title:"충전기 상태 현황",            gridArea:"2 / 4 / 3 / 5" },

        { id:"chart4", component:"DailyUnconfirmBarChart",title:"일별 상태 미확인 충전기 개수", gridArea:"3 / 2 / 4 / 3" },
        { id:"list2",  component:"AnomalyList", title:"상태 미확인 충전소 리스트", dataKey:"unconfirmed", gridArea:"3 / 3 / 4 / 4" },
        { id:"list1",  component:"UncheckList", title:"이상탐지 위험 충전소 리스트", dataKey:"risk",       gridArea:"3 / 4 / 4 / 5" },
    ];

    // 전체 사용 가능한 컴포넌트 목록 (고정)
    const availableComponents = useMemo(() => defaultLayout, []);

    // ✅ [추가] 헤더 전역 저장값 로드
    const [layout, setLayout] = useState(() => {
        if (typeof window === "undefined") return defaultLayout;
        const saved = loadMonitoringDashboard();
        if (saved?.layout && Array.isArray(saved.layout)) return saved.layout;
        return defaultLayout;
    });


    // ✅ [추가] 삭제된 컴포넌트 복원
    const [removedComponents, setRemovedComponents] = useState(() => {
        if (typeof window === "undefined") return [];
        const saved = loadMonitoringDashboard();
        if (saved?.removedComponents && Array.isArray(saved.removedComponents)) {
            return saved.removedComponents;
        }
        return [];
    });


    // ✅ [추가] 빈 슬롯 선택 상태 복원
    const [emptySlotSelections, setEmptySlotSelections] = useState(() => {
        if (typeof window === "undefined") return {};
        const saved = loadMonitoringDashboard();
        if (saved?.emptySlotSelections && typeof saved.emptySlotSelections === "object") {
            return saved.emptySlotSelections;
        }
        return {};
    });


    // ✅ [추가] 상태 변경 시마다 헤더 전역변수에 저장(로그아웃 전까지 유지)
    useEffect(() => {
        const t = setTimeout(() => {
            saveMonitoringDashboard({ layout, removedComponents, emptySlotSelections });
        }, 300);
        return () => clearTimeout(t);
    }, [layout, removedComponents, emptySlotSelections]);


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


    /**/
    const goDetail = (id) => {
        const url = `/pages/monitoringDetail/${id}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };
    /**/


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

    // 🎨 드래그 앤 드롭 핸들러
    const handleDragStart = (e, item) => {
        if (!isEditMode) return;
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, targetItem) => {
        if (!isEditMode || !draggedItem || draggedItem.id === targetItem.id) {
            setDraggedItem(null);
            return;
        }
        e.preventDefault();

        // 위치 교환
        const newLayout = layout.map(item => {
            if (item.id === draggedItem.id) {
                return { ...item, gridArea: targetItem.gridArea };
            }
            if (item.id === targetItem.id) {
                return { ...item, gridArea: draggedItem.gridArea };
            }
            return item;
        });

        setLayout(newLayout);
        setDraggedItem(null);
    };

    const handleResetLayout = () => {
        if (window.confirm("레이아웃을 초기화하시겠습니까?")) {
            setLayout(defaultLayout);
            setRemovedComponents([]);
            setEmptySlotSelections({});
        }
    };

    // 🗑️ 컴포넌트 삭제
    const handleRemoveComponent = (itemId) => {
        const removedItem = layout.find(item => item.id === itemId);
        if (removedItem) {
            setLayout(layout.filter(item => item.id !== itemId));
            setRemovedComponents([...removedComponents, removedItem]);
        }
    };

    // ➕ 컴포넌트 추가 (빈 공간에)
    const handleAddComponent = (targetGridArea, componentToAddId) => {
        if (!componentToAddId) return;

        // 추가할 컴포넌트 찾기
        const componentToAdd = removedComponents.find(c => c.id === componentToAddId);
        // 타겟 위치에 있던 컴포넌트 찾기 (빈 슬롯)
        const targetSlot = removedComponents.find(c => c.gridArea === targetGridArea);

        if (!componentToAdd || !targetSlot) return;

        // 위치 교환
        // 1. 추가할 컴포넌트를 레이아웃에 타겟 위치로 추가
        const newComponent = { ...componentToAdd, gridArea: targetGridArea };
        setLayout([...layout, newComponent]);

        // 2. 타겟 슬롯의 컴포넌트를 제거된 목록에서 추가할 컴포넌트가 있던 위치로 이동
        const updatedRemovedComponents = removedComponents.map(c => {
                if (c.id === targetSlot.id) {
                    // 타겟 슬롯을 추가할 컴포넌트가 있던 위치로 이동
                    return { ...c, gridArea: componentToAdd.gridArea };
                }
                return c;
            }).filter(c => c.id !== componentToAddId); // 추가된 컴포넌트는 제거

        setRemovedComponents(updatedRemovedComponents);
    };

    // 📦 컴포넌트 렌더링
    const renderComponent = (item) => {
        const cardClass = isEditMode ? `${styles.card} ${styles.draggableCard}` : styles.card;
        const cardStyle = { gridArea: item.gridArea };

        if (item.component === "UnconfirmStatusChart") {
            return (
                <section
                    key={item.id}
                    className={cardClass}
                    style={cardStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                >
                    {isEditMode && (
                        <>
                            <button
                                className={styles.deleteBtn}
                                onClick={() => handleRemoveComponent(item.id)}
                                title="삭제"
                            >
                                ×
                            </button>
                            <div className={styles.dragHint}>드래그하여 이동</div>
                        </>
                    )}
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <UnconfirmStatusChart />
                </section>
            );
        }

        if (item.component === "UnconfirmRegionChart") {
            return (
                <section
                    key={item.id}
                    className={cardClass}
                    style={cardStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                >
                    {isEditMode && (
                        <>
                            <button
                                className={styles.deleteBtn}
                                onClick={() => handleRemoveComponent(item.id)}
                                title="삭제"
                            >
                                ×
                            </button>
                            <div className={styles.dragHint}>드래그하여 이동</div>
                        </>
                    )}
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <UnconfirmRegionChart />
                </section>
            );
        }

        if (item.component === "SummaryChart") {
            return (
                <section
                    key={item.id}
                    className={cardClass}
                    style={cardStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                >
                    {isEditMode && (
                        <>
                            <button
                                className={styles.deleteBtn}
                                onClick={() => handleRemoveComponent(item.id)}
                                title="삭제"
                            >
                                ×
                            </button>
                            <div className={styles.dragHint}>드래그하여 이동</div>
                        </>
                    )}
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <SummaryChart total={152} />
                </section>
            );
        }


        if (item.component === "DailyUnconfirmBarChart") {
            return (
                <section
                    key={item.id}
                    className={cardClass}
                    style={cardStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                >
                    {isEditMode && (
                        <>
                            <button
                                className={styles.deleteBtn}
                                onClick={() => handleRemoveComponent(item.id)}
                                title="삭제"
                            >
                                ×
                            </button>
                            <div className={styles.dragHint}>드래그하여 이동</div>
                        </>
                    )}
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <DailyUnconfirmBarChart data={dailyUnconfirm} />
                </section>
            );
        }



        if (item.component === "UncheckList") {
            return (
                <div
                    key={item.id}
                    className={cardClass}
                    style={cardStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                >
                    {isEditMode && (
                        <>
                            <button
                                className={styles.deleteBtn}
                                onClick={() => handleRemoveComponent(item.id)}
                                title="삭제"
                            >
                                ×
                            </button>
                            <div className={styles.dragHint}>드래그하여 이동</div>
                        </>
                    )}

                    <UncheckList
                        styles={styles}
                        title={item.title}
                        stations={unconfirmedStations} // 상태 미확인 충전소 리스트 데이터
                        pageSize={5}
                        onView={goDetail}
                    />
                </div>
            );
        }

        if (item.component === "AnomalyList") {
            return (
                <div
                    key={item.id}
                    className={cardClass}
                    style={cardStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                >
                    {isEditMode && (
                        <>
                            <button
                                className={styles.deleteBtn}
                                onClick={() => handleRemoveComponent(item.id)}
                                title="삭제"
                            >
                                ×
                            </button>
                            <div className={styles.dragHint}>드래그하여 이동</div>
                        </>
                    )}
                    <AnomalyList
                        styles={styles}
                        title={item.title}
                        items={riskStations} //
                        pageSize={5}
                        onView={goDetail}
                    />
                </div>
            );
        }

        return null;
    };

    // 🔲 빈 슬롯 렌더링
    const renderEmptySlot = (removedComp) => {
        const { id, gridArea, title } = removedComp;
        const selectedComponent = emptySlotSelections[id] || "";

        return (
            <div
                key={`empty-${id}`}
                className={styles.emptySlot}
                style={{ gridArea }}
            >
                <p className={styles.emptySlotText}>비어있는 공간</p>
                <p className={styles.emptySlotText} style={{ fontSize: "11px", color: "#bbb", marginTop: "-8px" }}>
                    (원래: {title})
                </p>

                {removedComponents.length > 0 && (
                    <>
                        <div className={styles.componentSelector}>
                            <select
                                className={styles.selectorDropdown}
                                value={selectedComponent}
                                onChange={(e) => {
                                    setEmptySlotSelections({
                                        ...emptySlotSelections,
                                        [id]: e.target.value
                                    });
                                }}
                            >
                                <option value="">컴포넌트 선택</option>
                                {removedComponents.map(comp => (
                                    <option key={comp.id} value={comp.id}>
                                        {comp.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedComponent && (
                            <button
                                className={styles.addBtn}
                                onClick={() => {
                                    handleAddComponent(gridArea, selectedComponent);
                                    // 선택 초기화
                                    const newSelections = { ...emptySlotSelections };
                                    delete newSelections[id];
                                    setEmptySlotSelections(newSelections);
                                }}
                            >
                                추가
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.main}>
                <div className={styles.inner}>
                    <div className={styles.dashboardGrid}>
                        {/* 왼쪽 검색 패널 (고정) */}
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

                        {/* 🎨 편집 컨트롤 버튼들 */}
                        <div className={styles.editControls}>
                            {isEditMode && (
                                <button
                                    className={styles.resetBtn}
                                    onClick={handleResetLayout}
                                >
                                    초기화
                                </button>
                            )}
                            <button
                                className={`${styles.editBtn} ${isEditMode ? styles.active : ""}`}
                                onClick={() => setIsEditMode(!isEditMode)}
                            >
                                {isEditMode ? "완료" : "편집"}
                            </button>
                        </div>

                        {/* 📊 동적 레이아웃 렌더링 */}
                        {isEditMode ? (
                            <>
                                {/* 현재 레이아웃의 컴포넌트들 */}
                                {layout.map(item => renderComponent(item))}

                                {/* 삭제된 컴포넌트의 빈 슬롯 (편집 모드에서만 표시) */}
                                {/* 삭제 당시의 실제 위치(gridArea)를 사용 */}
                                {removedComponents.map(comp => renderEmptySlot(comp))}
                            </>
                        ) : (
                            /* 일반 모드: 현재 레이아웃만 표시 */
                            layout.map(item => renderComponent(item))
                        )}

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
