"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function MonitoringDetail() {
    const router = useRouter();

    const stationName = "충전소명";

    const chargers = [
        { id: "01", type: "단독", chargerType: "4C완속", status: "알수없음" },
        { id: "02", type: "동시", chargerType: "", status: "" },
        { id: "03", type: "", chargerType: "", status: "" },
    ];

    const detailInfo = {
        address: "",
        latitude: "",
        longitude: "",
        organization: "",
        contactNumber: "",
        installYear: "",
        notes: "",
    };

    return (
        <div className={styles.page}>
            <div className={styles.wrap}>
                {/* 상단 */}
                <header className={styles.top}>
                    <h1 className={styles.title}>{stationName}</h1>
                    <button
                        className={styles.topBtn}
                        onClick={() => router.push("/pages/monitoring")}
                    >
                        모니터링
                    </button>
                </header>

                {/* 본문 */}
                <div className={styles.grid}>
                    {/* 좌측 */}
                    <section className={styles.left}>
                        {/* 충전기 */}
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
                                    <div key={c.id} className={styles.tr}>
                                        <div>{c.type}</div>
                                        <div>{c.chargerType}</div>
                                        <div>{c.status}</div>
                                        <div>{c.id}</div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 상세정보 */}
                        <section>
                            <h2 className={styles.h2}>상세정보</h2>

                            {/* 도로명주소 */}
                            <div className={styles.field}>
                                <label className={styles.label}>도로명주소</label>
                                <div className={styles.row}>
                                    <div className={styles.box}>{detailInfo.address}</div>
                                    <div className={styles.boxSmall}>
                                        {detailInfo.latitude || detailInfo.longitude
                                            ? `${detailInfo.latitude || "-"}, ${detailInfo.longitude || "-"}`
                                            : "위도, 경도"}
                                    </div>
                                </div>
                            </div>

                            {/* 기관명 / 연락번호 */}
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

                            {/* 설치년도 */}
                            <div className={styles.fieldHalf}>
                                <label className={styles.label}>설치년도</label>
                                <div className={styles.box}>{detailInfo.installYear}</div>
                            </div>

                            {/* 안내 */}
                            <div className={styles.field}>
                                <label className={styles.label}>충전소 안내</label>
                                <div className={styles.box}>{detailInfo.notes}</div>
                            </div>
                        </section>
                    </section>

                    {/* 우측 */}
                    <aside className={styles.right}>
                        <h2 className={styles.h2}>CCTV 영상</h2>
                        <div className={styles.cctv} />
                        <button className={styles.cctvBtn}>
                            CCTV 이미지 보내기 <span>▶</span>
                        </button>
                    </aside>
                </div>
            </div>
        </div>
    );
}
