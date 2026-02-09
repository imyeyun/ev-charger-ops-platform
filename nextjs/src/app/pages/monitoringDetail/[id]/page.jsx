"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import styles from "./page.module.css";

async function postJson(url, payload) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        if (data && data.error) throw new Error(String(data.error));
        if (data && data.message) throw new Error(String(data.message));
        throw new Error("Internal Server Error");
    }

    if (data && data.error) throw new Error(String(data.error));

    return data;
}

function toText(v) {
    if (v === true) return "위험 있음";
    if (v === false) return "안전함";
    return "판단 불가";
}

/** ✅ (1) 충전기 상태 묶기 */
function mapStatToStatus(stat) {
    var n = Number(stat);
    if (n === 0 || n === 9 || n === 1) return "상태미확인";
    if (n === 2) return "사용가능";
    if (n === 3) return "충전중";
    if (n === 4 || n === 5) return "고장";
    return "상태미확인";
}

/** ✅ (2) 급속/완속 라벨 */
function mapChgerTypeToSpeedLabel(chgerType) {
    var code = String(chgerType === null || chgerType === undefined ? "" : chgerType);
    if (code === "02" || code === "07" || code === "08") return "완속";
    if (code !== "") return "급속";
    return "";
}

/** ✅ (3) chgerType 1:1 매핑 */
function mapChgerTypeToText(chgerType) {
    var code = String(chgerType === null || chgerType === undefined ? "" : chgerType).padStart(2, "0");

    var MAP = {
        "01": "DC 차데모",
        "02": "AC 완속",
        "03": "DC 차데모+AC3 상",
        "04": "DC 콤보",
        "05": "DC 차데모+DC 콤보",
        "06": "DC 차데모+AC3 상+DC 콤보",
        "07": "AC3 상",
        "08": "DC 콤보(완속)",
        "09": "NACS",
        "10": "DC 콤보+NACS",
        "11": "DC 콤보2(버스전용)",
    };

    if (MAP[code]) return MAP[code];
    return chgerType;
}

export default function MonitoringDetail() {
    const router = useRouter();
    const params = useParams();

    const statIdStr = useMemo(() => {
        if (!params) return "";
        if (!params.id) return "";
        return String(params.id);
    }, [params]);

    const [stationName, setStationName] = useState("충전소명");
    const [chargers, setChargers] = useState([]);
    const [detailInfo, setDetailInfo] = useState({
        address: "",
        organization: "",
        contactNumber: "",
        installYear: "",
        notes: "",
    });

    const [selectedChargerId, setSelectedChargerId] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [analysis, setAnalysis] = useState({
        fireYN:"",
        brokenYN:"",
        dirtyYN:"",
        notes:"",
    });

    useEffect(() => {
        if (!statIdStr) return;

        async function run() {
            setLoading(true);
            setError("");
            setImageUrl("");

            try {
                const data = await postJson("/api/monitoringApi/charging_station", { statId: statIdStr });

                if (!data) throw new Error("Internal Server Error");
                if (!data.chargingStation) throw new Error("Internal Server Error");
                if (!Array.isArray(data.chargers)) throw new Error("Internal Server Error");

                const station = data.chargingStation;
                const list = data.chargers;

                setStationName(station.statNm ? String(station.statNm) : "충전소명");

                setDetailInfo({
                    address: station.addr ? String(station.addr) : "",
                    organization: station.busidDescription ? String(station.busidDescription) : "",
                    contactNumber: station.busiCall ? String(station.busiCall) : "",
                    installYear: station.year !== undefined && station.year !== null ? String(station.year) : "",
                    notes: station.note ? String(station.note) : "",
                });

                const mapped = list.map((c) => {
                    return {
                        id: c.chgerId ? String(c.chgerId) : "",
                        chargerType: mapChgerTypeToText(c.chgerType),
                        speedLabel: mapChgerTypeToSpeedLabel(c.chgerType),
                        output: c.output ? String(c.output) : "",
                        method: c.method ? String(c.method) : "",
                        status: mapStatToStatus(c.stat),
                    };
                });

                setChargers(mapped);

                if (mapped.length > 0 && mapped[0].id) setSelectedChargerId(mapped[0].id);
                else setSelectedChargerId("");


                setImageUrl(data.image.imgPath);
                setAnalysis({fireYN: "", brokenYN: "", dirtyYN: "", notes: ""});
            } catch (e) {
                setError(String(e.message || "Internal Server Error"));
            } finally {
                setLoading(false);
            }
        }

        run();
    }, [statIdStr]);

    async function onSendCctvImage() {
        if (!statIdStr) return;
        if (!selectedChargerId) return;

        try {
            const payload = {
                statId: String(statIdStr),
                chgerId: String(selectedChargerId),
            };

            const res = await postJson("/api/monitoringApi/multimodal_analysis", payload);

            const v = res || {};

            setAnalysis({
                fireYN: toText(v.fireYN),
                brokenYN: toText(v.brokenYN),
                dirtyYN: toText(v.dirtyYN),
                notes: v.notes ? String(v.notes) : "",
            });
        } catch (e) {
            alert(String(e.message || "Internal Server Error"));
        }
    }


    return (
        <>
            <Header />

            <div className={styles.page}>
                <div className={styles.wrap}>
                    <header className={styles.top}>
                        <h1 className={styles.title}>{stationName}</h1>
                        <button className={styles.topBtn} onClick={() => router.push("/pages/monitoring")}>
                            모니터링
                        </button>
                    </header>

                    {loading && <div style={{ padding: 12 }}>불러오는 중...</div>}
                    {error && <div style={{ padding: 12, color: "crimson" }}>{error}</div>}

                    <div className={styles.grid}>
                        <section className={styles.left}>
                            <section>
                                <h2 className={styles.h2}>충전기</h2>

                                <div className={styles.table}>
                                    <div className={styles.trHead}>
                                        <div>충전기 ID</div>
                                        <div>충전기 상태</div>
                                        <div>충전기 출력</div>
                                        <div>충전기 타입</div>
                                    </div>

                                    {chargers.map((c) => (
                                        <div
                                            key={c.id}
                                            className={styles.tr}
                                            onClick={() => setSelectedChargerId(c.id)}
                                            style={{
                                                cursor: "pointer",
                                                outline: c.id === selectedChargerId ? "2px solid #4f8cff" : "none",
                                            }}
                                        >
                                            <div>{c.id}</div>
                                            <div>{c.status}</div>
                                            <div>
                                                {c.speedLabel}
                                                <br />
                                                {c.output}
                                                {c.output && " kW"}
                                                {c.method && ` / ${c.method}`}
                                            </div>
                                            <div>{c.chargerType}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 8, fontSize: 12 }}>
                                    선택된 충전기 ID: <b>{selectedChargerId || "-"}</b>
                                </div>
                            </section>

                            <section>
                                <h2 className={styles.h2}>상세정보</h2>

                                <div className={styles.field}>
                                    <label className={styles.label}>도로명주소</label>
                                    <div className={styles.row}>
                                        <div className={styles.box}>{detailInfo.address}</div>
                                    </div>
                                </div>

                                <div className={styles.field2}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>기관명</label>
                                        <div className={styles.box}>{detailInfo.organization}</div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>관리업체 연락번호</label>
                                        <div className={styles.box}>{detailInfo.contactNumber}</div>
                                    </div>
                                </div>

                                <div className={styles.fieldHalf}>
                                    <label className={styles.label}>설치년도</label>
                                    <div className={styles.box}>{detailInfo.installYear}</div>
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>충전소 안내</label>
                                    <div className={styles.box}>{detailInfo.notes}</div>
                                </div>
                            </section>
                        </section>

                        <aside className={styles.right}>
                            <h2 className={styles.h2}>CCTV 영상</h2>

                            <div className={styles.cctv}>
                                {imageUrl && (
                                    <img
                                        src={imageUrl}
                                        alt="cctv"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                )}
                            </div>

                            <button className={styles.cctvBtn} onClick={onSendCctvImage}>
                                CCTV 이미지 분석 <span>▶</span>
                            </button>

                            {/* ✅ 분석 결과 표시 영역 (추가) */}
                            <div className={styles.analysisWrap}>
                                <div className={styles.analysisLeft}>
                                    <div className={styles.analysisRow}>
                                        <div className={styles.analysisLabel}>화재</div>
                                        <div className={styles.analysisBox}>{analysis.fireYN || "-"}</div>
                                    </div>
                                    <div className={styles.analysisRow}>
                                        <div className={styles.analysisLabel}>고장</div>
                                        <div className={styles.analysisBox}>{analysis.brokenYN || "-"}</div>
                                    </div>
                                    <div className={styles.analysisRow}>
                                        <div className={styles.analysisLabel}>청결</div>
                                        <div className={styles.analysisBox}>{analysis.dirtyYN || "-"}</div>
                                    </div>
                                </div>

                                <div className={styles.analysisRight}>
                                    <div className={styles.analysisNotes}>{analysis.notes || ""}</div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </>
    );
}
