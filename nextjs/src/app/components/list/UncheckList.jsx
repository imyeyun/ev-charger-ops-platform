"use client";

import { useMemo, useState, useEffect } from "react";

let _cachedItems = null;        // [{id,name}]
let _inflight = null;           // Promise

async function getUncheckItems() {
    if (_cachedItems) return _cachedItems;
    if (_inflight) return _inflight;

    _inflight = (async () => {
        const res = await fetch("/api/componentApi/UncheckList", {
            method: "GET",
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const msg = data?.error || "리스트를 불러오지 못했습니다.";
            throw new Error(msg);
        }

        const list = Array.isArray(data?.chargerBadCaseList) ? data.chargerBadCaseList : [];
        const mapped = list.map((x) => ({
            id: x.statId ? String(x.statId) : "",
            name: x.statNm ? String(x.statNm) : "",
        }));

        _cachedItems = mapped;
        return mapped;
    })();

    try {
        return await _inflight;
    } finally {
        _inflight = null;
    }
}

export default function UncheckList({
                                        styles,
                                        title,
                                        pageSize = 5,
                                        onView,
                                        renderRow,
                                        onPageIdsChange,
                                    }) {
    const [items, setItems] = useState([]); // ✅ state로 관리
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ✅ API 호출
    useEffect(() => {
        let alive = true;

        async function run() {
            setLoading(true);
            setError("");

            try {
                const mapped = await getUncheckItems();
                if (alive) setItems(mapped);
            } catch (e) {
                if (alive) setError(String(e?.message || "리스트를 불러오지 못했습니다."));
            } finally {
                if (alive) setLoading(false);
            }
        }

        run();
        return () => {
            alive = false;
        };
    }, []);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

    useEffect(() => {
        if (typeof onPageIdsChange !== "function") return;
        onPageIdsChange(pageItems.map((x) => x.id).filter(Boolean));
    }, [pageItems, onPageIdsChange]);

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

    const pagerItems = useMemo(() => getPagination(page, totalPages), [page, totalPages]);

    return (
        <section className={styles.card}>
            {/*<h3 className={styles.listTitle}>{title}</h3>*/}

            {loading && <div className={styles.listBody}>불러오는 중...</div>}
            {error && <div className={styles.listBody} style={{ color: "crimson" }}>{error}</div>}

            {!loading && !error && (
                <div className={styles.listBody}>
                    {pageItems.map((s) => {
                        // ✅ [수정] 커스텀 렌더가 있으면 그걸 사용
                        if (typeof renderRow === "function") return renderRow(s);

                        // ✅ 기존 렌더 그대로
                        return (
                            <div key={s.id} className={styles.listItemRow}>
                                <span className={styles.listItemText}>{s.name}</span>
                                <button className={styles.viewBtn} onClick={() => onView?.(s.id)}>
                                    보기
                                </button>
                            </div>
                        );
                    })}
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
