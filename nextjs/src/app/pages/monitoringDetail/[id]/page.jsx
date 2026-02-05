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
    if (v === undefined) return "";
    if (v === null) return "";
    return String(v);
}

function mapStatusToText(stat) {
    return toText(stat);
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
                        type: c.chgerType ? String(c.chgerType) : "",
                        chargerType: c.output ? String(c.output) : "",
                        status: mapStatusToText(c.stat),
                    };
                });


                setChargers(mapped);

                if (mapped.length > 0 && mapped[0].id) setSelectedChargerId(mapped[0].id);
                else setSelectedChargerId("");

                try {
                    const imgRes = await fetch(
                        `/api/monitoringApi/charging_station_image?statId=${encodeURIComponent(statIdStr)}`,
                        { cache: "no-store" }
                    );

                    const imgData = await imgRes.json().catch(() => null);

                    if (imgRes.ok && imgData) {
                        const url =
                            imgData.presignedUrl && String(imgData.presignedUrl).trim()
                                ? String(imgData.presignedUrl).trim()
                                : "";

                        setImageUrl(url);
                    } else {
                        setImageUrl("");
                    }
                } catch {
                    setImageUrl("");
                }
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

            const fireYN = res && res.fireYN !== undefined && res.fireYN !== null ? String(res.fireYN) : "-";
            const brokenYN = res && res.brokenYN !== undefined && res.brokenYN !== null ? String(res.brokenYN) : "-";
            const cleanYN = res && res.cleanYN !== undefined && res.cleanYN !== null ? String(res.cleanYN) : "-";

            const fireDetails = res && res.fireDetails ? String(res.fireDetails) : "";
            const brokeDetails = res && res.brokeDetails ? String(res.brokeDetails) : "";
            const cleanDetails = res && res.cleanDetails ? String(res.cleanDetails) : "";

            const msg =
                "분석 결과\n" +
                "- 화재: " + fireYN + "\n" +
                "- 고장: " + brokenYN + "\n" +
                "- 청결: " + cleanYN + "\n\n" +
                "상세\n" +
                "- 화재: " + fireDetails + "\n" +
                "- 고장: " + brokeDetails + "\n" +
                "- 청결: " + cleanDetails;

            alert(msg);
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
                                        <div>구분</div>
                                        <div>충전기 타입</div>
                                        <div>충전기 상태</div>
                                        <div>충전기 ID</div>
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
                                            <div>{c.type}</div>
                                            <div>{c.chargerType}</div>
                                            <div>{c.status}</div>
                                            <div>{c.id}</div>
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
                                        <div className={styles.box}>{detailInfo.address}</div></div>
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
                                CCTV 이미지 보내기 <span>▶</span>
                            </button>
                        </aside>
                    </div>
                </div>
            </div>
        </>
    );
}



