"use client";

import { useMemo, useState } from "react";
import Header from "../../../components/Header";
import ChatWidget from "../../../components/ChatWidget";

export default function MonitoringPage() {
    const LIST_PAGE_SIZE = 5;

    const LEFT_LIST_VISIBLE_COUNT = 7;

    // 왼쪽 리스트 한 줄 높이(너 UI 기준으로 이미 세로는 맞췄다 했으니,
    // "보이는 개수"를 맞추기 위한 계산값만 사용)
    const LEFT_ROW_HEIGHT = 36;
    const LEFT_ROW_GAP = 8;
    const LEFT_LIST_MAX_HEIGHT =
        LEFT_LIST_VISIBLE_COUNT * LEFT_ROW_HEIGHT +
        (LEFT_LIST_VISIBLE_COUNT - 1) * LEFT_ROW_GAP;

    // -------------------------
    // 필터 state (원본 유지)
    // -------------------------
    const [region, setRegion] = useState("");
    const [city, setCity] = useState("");
    const [stationType, setStationType] = useState("");
    const [chargeType, setChargeType] = useState("");
    const [stationName, setStationName] = useState("");

    // ✅ ChatWidget 토글 state (추가)
    const [chatOpen, setChatOpen] = useState(false);

    // -------------------------
    // 더미 데이터 (원본 스타일 유지)
    // -------------------------
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

    // -------------------------
    // 검색/초기화 (원본 유지)
    // -------------------------
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

    // ======================================================
    // ✅ (요구2) 가운데 2개 리스트: 페이징 로직
    // ======================================================
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
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontFamily: "Arial, sans-serif",
                    fontSize: 12,
                    marginTop: 12,
                    userSelect: "none",
                }}
            >
                {/* < */}
                <span
                    onClick={() => page > 1 && onChange(page - 1)}
                    style={{
                        color: page > 1 ? "#666666" : "#cccccc",
                        cursor: page > 1 ? "pointer" : "default",
                    }}
                >
          &lt;
        </span>

                {/* numbers + ... */}
                {items.map((p, idx) => {
                    if (p === "...") {
                        // ✅ ... 은 클릭 안됨
                        return (
                            <span
                                key={`dots-${idx}`}
                                style={{ color: "#666666", cursor: "default", pointerEvents: "none" }}
                            >
                ...
              </span>
                        );
                    }

                    const active = p === page;
                    return (
                        <span
                            key={p}
                            onClick={() => onChange(p)}
                            style={{
                                color: active ? "#2196f3" : "#666666",
                                fontWeight: active ? 700 : 400,
                                fontStyle: active ? "italic" : "normal",
                                cursor: "pointer",
                            }}
                        >
              {p}
            </span>
                    );
                })}

                {/* > */}
                <span
                    onClick={() => page < totalPages && onChange(page + 1)}
                    style={{
                        color: page < totalPages ? "#666666" : "#cccccc",
                        cursor: page < totalPages ? "pointer" : "default",
                    }}
                >
          &gt;
        </span>
            </div>
        );
    };

    // ======================================================
    // UI (레이아웃/세로는 건드리지 않음)
    // ======================================================
    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#ffffff",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Header />

            <main style={{ flex: 1 }}>
                <div
                    style={{
                        maxWidth: 1500,
                        margin: "0 auto",
                        padding: "28px 24px",
                        display: "flex",
                        gap: 24,
                    }}
                >
                    {/* =========================
              왼쪽 필터 영역
              ========================= */}
                    <div style={{ width: 300 }}>
                        <div
                            style={{
                                border: "1px solid #e6e6e6",
                                borderRadius: 10,
                                padding: 16,
                                background: "#fff",
                            }}
                        >
                            {/* 지역 선택 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                                <label
                                    style={{
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "#333333",
                                    }}
                                >
                                    지역 선택
                                </label>

                                <div style={{ display: "flex", gap: 12 }}>
                                    <select
                                        style={{
                                            width: "50%",
                                            height: 34,
                                            padding: "0 12px",
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #d6d6d6",
                                            borderRadius: 6,
                                            fontFamily: "Arial, sans-serif",
                                            fontSize: 12,
                                            color: "#666666",
                                            cursor: "pointer",
                                        }}
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                    >
                                        <option value="">시/도</option>
                                    </select>

                                    <select
                                        style={{
                                            width: "50%",
                                            height: 34,
                                            padding: "0 12px",
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #d6d6d6",
                                            borderRadius: 6,
                                            fontFamily: "Arial, sans-serif",
                                            fontSize: 12,
                                            color: "#666666",
                                            cursor: "pointer",
                                        }}
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    >
                                        <option value="">시/군</option>
                                    </select>
                                </div>
                            </div>

                            {/* 충전소 분류 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                                <label
                                    style={{
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "#333333",
                                    }}
                                >
                                    충전소 분류
                                </label>

                                <select
                                    style={{
                                        width: "100%",
                                        height: 34,
                                        padding: "0 12px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #d6d6d6",
                                        borderRadius: 6,
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 12,
                                        color: "#666666",
                                        cursor: "pointer",
                                    }}
                                    value={stationType}
                                    onChange={(e) => setStationType(e.target.value)}
                                >
                                    <option value="">전체</option>
                                </select>
                            </div>

                            {/* 충전소 타입 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                                <label
                                    style={{
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "#333333",
                                    }}
                                >
                                    충전소 타입
                                </label>

                                <select
                                    style={{
                                        width: "100%",
                                        height: 34,
                                        padding: "0 12px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #d6d6d6",
                                        borderRadius: 6,
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 12,
                                        color: "#666666",
                                        cursor: "pointer",
                                    }}
                                    value={chargeType}
                                    onChange={(e) => setChargeType(e.target.value)}
                                >
                                    <option value="">전체</option>
                                </select>

                                <input
                                    type="text"
                                    style={{
                                        width: "90%",
                                        height: 34,
                                        marginTop: 10,
                                        padding: "0 12px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #d6d6d6",
                                        borderRadius: 6,
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 12,
                                        color: "#666666",
                                    }}
                                    placeholder="충전소명"
                                    value={stationName}
                                    onChange={(e) => setStationName(e.target.value)}
                                />
                            </div>

                            {/* 버튼 */}
                            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                                <button
                                    onClick={handleSearch}
                                    style={{
                                        flex: 1,
                                        height: 40,
                                        backgroundColor: "#2196f3",
                                        border: "none",
                                        borderRadius: 8,
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "#ffffff",
                                        cursor: "pointer",
                                    }}
                                >
                                    검색하기
                                </button>

                                <button
                                    onClick={handleReset}
                                    style={{
                                        flex: 1,
                                        height: 40,
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #d6d6d6",
                                        borderRadius: 8,
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "#111",
                                        cursor: "pointer",
                                    }}
                                >
                                    초기화
                                </button>
                            </div>

                            <div
                                style={{
                                    marginTop: 30,
                                    border: "1px solid #e6e6e6",
                                    borderRadius: 10,
                                    padding: 12,
                                    background: "#fff",
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#333333",
                                        marginBottom: 10,
                                    }}
                                >
                                    충전소명
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: LEFT_ROW_GAP,
                                        maxHeight: LEFT_LIST_MAX_HEIGHT, // ✅ 변수로 제어
                                        overflowY: "auto", // ✅ 휠 스크롤
                                        paddingRight: 4,
                                    }}
                                >
                                    {stationList.map((station, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                height: LEFT_ROW_HEIGHT,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontFamily: "Arial, sans-serif",
                                                    fontSize: 12,
                                                    color: "#333333",
                                                    flex: 1,
                                                }}
                                            >
                                                {station.name}
                                            </div>

                                            {station.status && (
                                                <span
                                                    style={{
                                                        minWidth: 54,
                                                        height: 30,
                                                        backgroundColor:
                                                            station.status === "사용중"
                                                                ? "#2e7d32"
                                                                : station.status === "상태미확인"
                                                                    ? "#f59e0b"
                                                                    : "#2196f3",
                                                        borderRadius: 6,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontFamily: "Arial, sans-serif",
                                                        fontSize: 10,
                                                        color: "#ffffff",
                                                        padding: "0 8px",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                          {station.status}
                        </span>
                                            )}

                                            <span
                                                style={{
                                                    minWidth: 45,
                                                    height: 30,
                                                    backgroundColor: "#e0e0e0",
                                                    borderRadius: 6,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontFamily: "Arial, sans-serif",
                                                    fontSize: 10,
                                                    color: "#000000",
                                                    padding: "0 8px",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                        {station.type}
                      </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* 차트 3개 (그대로) */}
                        <div style={{ display: "flex", gap: 20 }}>
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e6e6e6",
                                    borderRadius: 10,
                                    padding: 20,
                                    minHeight: 300,
                                }}
                            >
                                <h3
                                    style={{
                                        fontFamily: "Inter, Arial, sans-serif",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#333333",
                                        textAlign: "center",
                                        marginBottom: 14,
                                    }}
                                >
                                    상태미확인 충전기 현황
                                </h3>
                                <div
                                    style={{
                                        width: "100%",
                                        height: 240,
                                        backgroundColor: "#f2f2f2",
                                        borderRadius: 8,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#999999",
                                        fontSize: 12,
                                    }}
                                >
                                    차트
                                </div>
                            </div>

                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e6e6e6",
                                    borderRadius: 10,
                                    padding: 20,
                                    minHeight: 160,
                                }}
                            >
                                <h3
                                    style={{
                                        fontFamily: "Inter, Arial, sans-serif",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#333333",
                                        textAlign: "center",
                                        marginBottom: 14,
                                    }}
                                >
                                    지역별 상태 미확인 비율
                                </h3>
                                <div
                                    style={{
                                        width: "100%",
                                        height: 240,
                                        backgroundColor: "#f2f2f2",
                                        borderRadius: 8,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#999999",
                                        fontSize: 12,
                                    }}
                                >
                                    차트
                                </div>
                            </div>

                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e6e6e6",
                                    borderRadius: 10,
                                    padding: 20,
                                    minHeight: 160,
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <h3
                                    style={{
                                        fontFamily: "Inter, Arial, sans-serif",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#333333",
                                        textAlign: "center",
                                        marginBottom: 18,
                                    }}
                                >
                                    충전기 상태 현황
                                </h3>
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>152</div>
                                        <div style={{ fontSize: 11, color: "#999" }}>전체</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* =========================
                ✅ (요구2) 가운데 리스트 2개: 페이지당 LIST_PAGE_SIZE + 페이지네이션
                ========================= */}
                        <div style={{ display: "flex", gap: 20 }}>
                            {/* 위험 리스트 */}
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e6e6e6",
                                    borderRadius: 10,
                                    padding: 16,
                                }}
                            >
                                <h3
                                    style={{
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: "#111",
                                        textAlign: "center",
                                        marginBottom: 12,
                                    }}
                                >
                                    이상탐지 위험 충전소 리스트
                                </h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {riskPageItems.map((station) => (
                                        <div
                                            key={station.id}
                                            style={{
                                                width: "95%",
                                                height: 44,
                                                padding: "0 14px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                border: "1px solid #efefef",
                                                borderRadius: 10,
                                                background: "#fff",
                                            }}
                                        >
                      <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#333333" }}>
                        {station.name}
                      </span>

                                            <button
                                                type="button"
                                                style={{
                                                    width: 44,
                                                    height: 24,
                                                    backgroundColor: "#ffffff",
                                                    border: "2px solid #1b6fff",
                                                    borderRadius: 999,
                                                    fontFamily: "Arial, sans-serif",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: "#1b6fff",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                보기
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <Pagination page={riskPage} totalPages={riskTotalPages} onChange={setRiskPage} />
                            </div>

                            {/* 미확인 리스트 */}
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e6e6e6",
                                    borderRadius: 10,
                                    padding: 16,
                                }}
                            >
                                <h3
                                    style={{
                                        fontFamily: "Arial, sans-serif",
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: "#111",
                                        textAlign: "center",
                                        marginBottom: 12,
                                    }}
                                >
                                    상태 미확인 충전소 리스트
                                </h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {unconfirmedPageItems.map((station) => (
                                        <div
                                            key={station.id}
                                            style={{
                                                width: "95%",
                                                height: 44,
                                                padding: "0 14px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                border: "1px solid #efefef",
                                                borderRadius: 10,
                                                background: "#fff",
                                            }}
                                        >
                      <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#333333" }}>
                        {station.name}
                      </span>

                                            <button
                                                type="button"
                                                style={{
                                                    width: 44,
                                                    height: 24,
                                                    backgroundColor: "#ffffff",
                                                    border: "2px solid #1b6fff",
                                                    borderRadius: 999,
                                                    fontFamily: "Arial, sans-serif",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: "#1b6fff",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                보기
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <Pagination page={unconfirmedPage} totalPages={unconfirmedTotalPages} onChange={setUnconfirmedPage} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ✅ ChatWidget 렌더 (추가) */}
                <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
            </main>

            {/* 하단 버튼들 (원본 유지) */}
            <div
                style={{
                    position: "fixed",
                    bottom: 20,
                    left: 20,
                    right: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    pointerEvents: "none",
                }}
            >
                <button
                    onClick={() => setChatOpen((prev) => !prev)} // ✅ 토글만 추가
                    style={{
                        width: 79,
                        height: 60,
                        backgroundColor: "#1b6fff",
                        border: "none",
                        borderRadius: 999,
                        fontFamily: "Noto Sans KR, Arial, sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#ffffff",
                        cursor: "pointer",
                        pointerEvents: "auto",
                    }}
                >
                    챗봇
                </button>

                <button
                    style={{
                        padding: "16px 32px",
                        backgroundColor: "#1b6fff",
                        border: "none",
                        borderRadius: 10,
                        fontFamily: "Arial, sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#ffffff",
                        cursor: "pointer",
                        pointerEvents: "auto",
                        boxShadow: "0 6px 16px rgba(27,111,255,0.25)",
                    }}
                >
                    알림 전송
                </button>
            </div>
        </div>
    );
}
