"use client";

export default function StationList({ styles, title, stations, maxHeightPx, onSelect }) {
    return (
        <section className={styles.card}>
            <h3 className={styles.subTitle}>{title}</h3>

            <div className={styles.leftList} style={{ "--leftListMaxHeight": `${maxHeightPx}px` }}>
                {stations.map((station) => {
                    const statusClass =
                        station.status === "사용중"
                            ? styles.badgeUsing
                            : station.status === "상태미확인"
                                ? styles.badgeUnknown
                                : styles.badgeAvailable;

                    return (
                        <div
                            key={station.id}
                            className={styles.stationRow}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelect(station.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") onSelect(station.id);
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
    );
}
