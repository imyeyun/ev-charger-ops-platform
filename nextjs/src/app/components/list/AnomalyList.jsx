"use client";

import { useMemo, useState, useEffect } from "react";

export default function AnomalyList({
                                        styles,
                                        title,
                                        pageSize = 5,
                                        onView,
                                    }) {
    const [items, setItems] = useState([]);      // ✅ props → state로 변경
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ✅ API 호출
    useEffect(() => {
        // API 요청은 시간이 걸리는 작업이므로 현재 컴포넌트가 살아있는지 체크하기 위함
        let alive = true;

        async function run() {
            setLoading(true); // 로딩 UI를 보여주기 위함
            setError(""); // 이전 에러가 존재한다면 지우기

            try {
                const res = await fetch("/api/componentApi/AnomalyList", {
                    method: "GET",
                    cache: "no-store", // 캐시된 값 사용 x, 매번 새로 요청
                });

                const data = await res.json().catch(() => null); // 응답 JSON 파싱

                if (!res.ok) { // HTTP 상태코드가 실패 -> error로 처리
                    const msg = data?.error || "리스트를 불러오지 못했습니다.";
                    throw new Error(msg);
                }

                // ✅ route가 payload 그대로 반환한다는 전제:
                // 스펙: { anomalyChargerList: [{ statId, statNm }, ...] }
                // anomalyChargerList가 배열이면 그걸 쓰고 아니면 빈 배열 처리
                const list = Array.isArray(data?.anomalyChargerList)
                    ? data.anomalyChargerList
                    : [];

                // ✅ UI에서 쓰는 형태로 매핑: { id, name }
                // statId -> id
                // statNm -> name
                const mapped = list.map((x) => ({
                    id: x.statId ? String(x.statId) : "",
                    name: x.statNm ? String(x.statNm) : "",
                }));

                if (alive) setItems(mapped); // state 업데이트
            } catch (e) {
                if (alive) setError(String(e.message || "리스트를 불러오지 못했습니다."));
            } finally {
                if (alive) setLoading(false); // 로딩 종료
            }
        }

        run();
        return () => {
            alive = false;
        };
    }, []);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize)); //총 페이지 수
    const [page, setPage] = useState(1); // 현재 보고 있는 페이지 번호 state

    useEffect(() => { // 빈 페이지가 되지 않도록 보정
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const pageItems = useMemo(() => { // 현재 페이지에 해당하는 목록만 잘라낸 배열
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

    const getPagination = (current, total) => { // 페이지 목록 버튼을 만드는 함수
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

    const pagerItems = useMemo(() => getPagination(page, totalPages), [page, totalPages]);

    return (
        <section className={styles.card}>
            <h3 className={styles.listTitle}>{title}</h3>

            {loading && <div className={styles.listBody}>불러오는 중...</div>}
            {error && <div className={styles.listBody} style={{ color: "crimson" }}>{error}</div>}

            {!loading && !error && (
                <div className={styles.listBody}>
                    {pageItems.map((s) => (
                        <div key={s.id} className={styles.listItemRow}>
                            <span className={styles.listItemText}>{s.name}</span>
                            <button className={styles.viewBtn} onClick={() => onView?.(s.id)}>
                                보기
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        className={styles.pageArrow}
                        onClick={() => page > 1 && setPage(page - 1)}
                        disabled={page <= 1}
                    >
                        &lt;
                    </button>

                    {pagerItems.map((p, idx) => {
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
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        );
                    })}

                    <button
                        className={styles.pageArrow}
                        onClick={() => page < totalPages && setPage(page + 1)}
                        disabled={page >= totalPages}
                    >
                        &gt;
                    </button>
                </div>
            )}
        </section>
    );
}
